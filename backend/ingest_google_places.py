"""
Ingest real place data from Google Places API (New) into the VYBE database.

Usage:
  python backend/ingest_google_places.py
  python backend/ingest_google_places.py --city "Mumbai" --lat 19.0760 --lng 72.8777

Idempotent: safe to run multiple times. Skips places already in DB by google_place_id.
After running, execute ai-worker/generate_vibes.py to generate vibe vectors.
"""

import asyncio
import argparse
import sys
import os
import re
import time

import httpx
from sqlalchemy import select

sys.path.insert(0, os.path.dirname(__file__))

from app.db.base import AsyncSessionLocal as async_session
from app.db.models import Place
from app.db.models.city import City
from app.core.config import settings

GOOGLE_API_KEY = settings.GOOGLE_PLACES_API_KEY
PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = "places.id,places.displayName,places.rating,places.formattedAddress,places.location,places.priceLevel,places.photos,places.reviews"

PRICE_LEVEL_MAP = {
    "PRICE_LEVEL_FREE": 1,
    "PRICE_LEVEL_INEXPENSIVE": 1,
    "PRICE_LEVEL_MODERATE": 2,
    "PRICE_LEVEL_EXPENSIVE": 3,
    "PRICE_LEVEL_VERY_EXPENSIVE": 4,
}

# (query, includedType) — forces Google to return only that place type
SEARCH_QUERIES = [
    ("aesthetic cafes", "cafe"),
    ("cozy coffee shops", "cafe"),
    ("rooftop restaurants", "restaurant"),
    ("trendy brunch spots", "restaurant"),
    ("romantic fine dining", "restaurant"),
    ("farm to table restaurants", "restaurant"),
    ("seafood restaurants", "restaurant"),
    ("budget friendly cafes", "cafe"),
    ("artisan coffee", "cafe"),
    ("wine bars", "bar"),
    ("cocktail bars", "bar"),
    ("late night bars", "bar"),
]


_CITIES = ['Ahmedabad', 'Mumbai', 'Bangalore', 'Delhi', 'Pune', 'Surat', 'Vadodara', 'Gandhinagar',
           'San Francisco', 'Los Angeles', 'New York', 'Chicago', 'Seattle', 'Austin']
_CITY_PAT = '|'.join(_CITIES)


def clean_place_name(name: str) -> str:
    """Strip SEO noise that Google My Business owners stuff into place names."""
    # "Cafe Name | Best Cafe in City" → "Cafe Name"
    name = name.split(' | ')[0].strip()
    # Strip trailing " - <City>" / " – <City>" / " in <City>" / " <City>"
    name = re.sub(rf'\s*[-–]\s*(in\s+)?({_CITY_PAT})\s*$', '', name).strip()
    name = re.sub(rf'\s+(in\s+)?({_CITY_PAT})\s*$', '', name).strip()
    # Remove any trailing dangling prepositions or punctuation left behind
    name = re.sub(r'\s+in\s*$', '', name).strip()
    name = re.sub(r'[,\s]+$', '', name).strip()
    # For still-long names (>45 chars) cut at first dash — usually "Cafe - marketing text"
    if len(name) > 45:
        for sep in (' - ', ' – '):
            if sep in name:
                name = name.split(sep)[0].strip()
                break
    return name


def build_photo_url(photo_name: str) -> str:
    return f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=800&key={GOOGLE_API_KEY}"


async def get_or_create_city(db, name: str, lat: float, lng: float) -> int:
    result = await db.execute(select(City).where(City.name == name))
    city = result.scalar_one_or_none()
    if city:
        return city.id
    city = City(name=name, country=args_country)
    db.add(city)
    await db.flush()
    return city.id


async def fetch_places_for_query(client: httpx.AsyncClient, query: str, place_type: str, lat: float, lng: float) -> list:
    payload = {
        "textQuery": f"{query} {args_city_name}",
        "includedType": place_type,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 32000,  # 20 miles
            }
        },
        "maxResultCount": 20,
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    try:
        resp = await client.post(PLACES_SEARCH_URL, json=payload, headers=headers, timeout=15)
        resp.raise_for_status()
        return resp.json().get("places", [])
    except httpx.HTTPStatusError as e:
        print(f"  [error] Google API {e.response.status_code} for query '{query}': {e.response.text[:200]}")
        return []
    except Exception as e:
        print(f"  [error] Request failed for '{query}': {e}")
        return []


async def ingest(city_name: str, lat: float, lng: float):
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_PLACES_API_KEY is not set in .env")
        sys.exit(1)

    async with async_session() as db:
        city_id = await get_or_create_city(db, city_name, lat, lng)
        print(f"City: {city_name} (id={city_id})")

        # Load existing google_place_ids to skip duplicates
        existing = await db.execute(
            select(Place.google_place_id).where(Place.google_place_id.isnot(None))
        )
        seen_ids = set(r[0] for r in existing.all())
        print(f"Existing Google places in DB: {len(seen_ids)}")

        inserted = 0
        skipped = 0

        async with httpx.AsyncClient() as client:
            for query, place_type in SEARCH_QUERIES:
                print(f"\nSearching: '{query} {city_name}' (type={place_type})")
                places = await fetch_places_for_query(client, query, place_type, lat, lng)
                print(f"  Got {len(places)} results")

                for p in places:
                    gid = p.get("id", "")
                    if gid in seen_ids:
                        skipped += 1
                        continue
                    seen_ids.add(gid)

                    name = clean_place_name(p.get("displayName", {}).get("text", "Unknown"))
                    location = p.get("location", {})
                    place_lat = location.get("latitude", lat)
                    place_lng = location.get("longitude", lng)
                    rating = float(p.get("rating", 4.0))
                    price_str = p.get("priceLevel", "PRICE_LEVEL_MODERATE")
                    price_range = PRICE_LEVEL_MAP.get(price_str, 2)
                    address = p.get("formattedAddress", city_name)

                    photos = p.get("photos", [])
                    image_url = build_photo_url(photos[0]["name"]) if photos else None

                    raw_reviews = p.get("reviews", [])
                    snippets = [
                        r["text"]["text"] for r in raw_reviews
                        if r.get("text", {}).get("languageCode", "en") == "en" and r.get("text", {}).get("text")
                    ][:5] or None

                    place = Place(
                        city_id=city_id,
                        name=name,
                        lat=place_lat,
                        lng=place_lng,
                        rating=rating,
                        price_range=price_range,
                        address=address,
                        image_url=image_url,
                        google_place_id=gid,
                        review_snippets=snippets,
                    )
                    db.add(place)
                    inserted += 1
                    print(f"  + {name} (₹{'₹' * (price_range - 1)}, ★{rating})")

                # Respect Google rate limits
                time.sleep(0.3)

        await db.commit()

    print(f"\nDone. Inserted {inserted} new places, skipped {skipped} duplicates.")
    print("Next step: python ai-worker/generate_vibes.py")


# Globals so helpers can reference city name/country in queries
args_city_name = "San Francisco"
args_country = "USA"

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest places from Google Places API")
    parser.add_argument("--city", default="San Francisco", help="City name")
    parser.add_argument("--lat", type=float, default=37.7749, help="City center latitude")
    parser.add_argument("--lng", type=float, default=-122.4194, help="City center longitude")
    parser.add_argument("--country", default="USA", help="Country name")
    args = parser.parse_args()

    args_city_name = args.city
    args_country = args.country

    asyncio.run(ingest(args.city, args.lat, args.lng))
