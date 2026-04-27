"""Run once to seed the database with San Francisco places.
Usage: cd backend && python seed.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.base import AsyncSessionLocal
from app.db.models import City, Place

PLACES = [
    # ── Mission District ────────────────────────────────────────────────────────
    {"name": "Tartine Bakery", "lat": 37.7612, "lng": -122.4241, "rating": 4.6, "price_range": 2, "address": "600 Guerrero St, Mission District, San Francisco"},
    {"name": "Dandelion Chocolate", "lat": 37.7627, "lng": -122.4197, "rating": 4.5, "price_range": 2, "address": "740 Valencia St, Mission District, San Francisco"},
    {"name": "Foreign Cinema", "lat": 37.7604, "lng": -122.4202, "rating": 4.4, "price_range": 3, "address": "2534 Mission St, Mission District, San Francisco"},
    {"name": "La Lengua", "lat": 37.7580, "lng": -122.4210, "rating": 4.3, "price_range": 2, "address": "2640 Mission St, Mission District, San Francisco"},
    {"name": "Ritual Coffee Roasters", "lat": 37.7624, "lng": -122.4219, "rating": 4.5, "price_range": 2, "address": "1026 Valencia St, Mission District, San Francisco"},
    {"name": "Dolores Park Cafe", "lat": 37.7592, "lng": -122.4269, "rating": 4.2, "price_range": 1, "address": "501 Dolores St, Mission District, San Francisco"},

    # ── SoMa ────────────────────────────────────────────────────────────────────
    {"name": "Sightglass Coffee", "lat": 37.7795, "lng": -122.4028, "rating": 4.6, "price_range": 2, "address": "270 7th St, SoMa, San Francisco"},
    {"name": "The Creamery", "lat": 37.7814, "lng": -122.3965, "rating": 4.2, "price_range": 2, "address": "74 Langton St, SoMa, San Francisco"},
    {"name": "Zero Zero", "lat": 37.7818, "lng": -122.4017, "rating": 4.3, "price_range": 2, "address": "826 Folsom St, SoMa, San Francisco"},
    {"name": "Bix", "lat": 37.7950, "lng": -122.4052, "rating": 4.4, "price_range": 3, "address": "56 Gold St, SoMa, San Francisco"},
    {"name": "Local Edition", "lat": 37.7852, "lng": -122.4012, "rating": 4.3, "price_range": 2, "address": "691 Market St, SoMa, San Francisco"},
    {"name": "Butter Bar", "lat": 37.7768, "lng": -122.4030, "rating": 4.1, "price_range": 2, "address": "354 11th St, SoMa, San Francisco"},

    # ── Hayes Valley ─────────────────────────────────────────────────────────────
    {"name": "Ritual Coffee Hayes Valley", "lat": 37.7766, "lng": -122.4239, "rating": 4.5, "price_range": 2, "address": "432B Octavia St, Hayes Valley, San Francisco"},
    {"name": "Rich Table", "lat": 37.7758, "lng": -122.4225, "rating": 4.6, "price_range": 3, "address": "199 Gough St, Hayes Valley, San Francisco"},
    {"name": "Biergarten", "lat": 37.7763, "lng": -122.4240, "rating": 4.3, "price_range": 1, "address": "424 Octavia St, Hayes Valley, San Francisco"},
    {"name": "Absinthe Brasserie", "lat": 37.7768, "lng": -122.4228, "rating": 4.3, "price_range": 3, "address": "398 Hayes St, Hayes Valley, San Francisco"},
    {"name": "Arlequin Cafe", "lat": 37.7764, "lng": -122.4235, "rating": 4.4, "price_range": 2, "address": "384B Hayes St, Hayes Valley, San Francisco"},
    {"name": "Smitten Ice Cream", "lat": 37.7762, "lng": -122.4231, "rating": 4.5, "price_range": 1, "address": "432 Octavia Blvd, Hayes Valley, San Francisco"},

    # ── Downtown / Union Square ───────────────────────────────────────────────────
    {"name": "Blue Bottle Coffee", "lat": 37.7879, "lng": -122.4044, "rating": 4.4, "price_range": 2, "address": "315 Linden St, Downtown, San Francisco"},
    {"name": "Wayfare Tavern", "lat": 37.7956, "lng": -122.4008, "rating": 4.5, "price_range": 4, "address": "558 Sacramento St, Downtown, San Francisco"},
    {"name": "Comstock Saloon", "lat": 37.7982, "lng": -122.4066, "rating": 4.4, "price_range": 2, "address": "155 Columbus Ave, Downtown, San Francisco"},
    {"name": "Perbacco", "lat": 37.7941, "lng": -122.3992, "rating": 4.4, "price_range": 3, "address": "230 California St, Downtown, San Francisco"},
    {"name": "Cafe de la Presse", "lat": 37.7891, "lng": -122.4074, "rating": 4.0, "price_range": 2, "address": "352 Grant Ave, Downtown, San Francisco"},
    {"name": "Cotogna", "lat": 37.7963, "lng": -122.4039, "rating": 4.6, "price_range": 3, "address": "490 Pacific Ave, Downtown, San Francisco"},
]


async def seed():
    async with AsyncSessionLocal() as db:
        city = City(name="San Francisco", country="USA")
        db.add(city)
        await db.flush()
        for p in PLACES:
            db.add(Place(city_id=city.id, image_url=None, **p))
        await db.commit()
        print(f"Seeded {len(PLACES)} places for {city.name} (city_id={city.id})")


if __name__ == "__main__":
    asyncio.run(seed())
