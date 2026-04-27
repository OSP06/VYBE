"""
Backfill review_snippets for existing places using Google Places Details API.

For places already in the DB that have a google_place_id but no review_snippets,
fetches up to 5 English reviews and stores them. Future ingestions via
ingest_google_places.py capture reviews automatically — this script is only
needed for places already in the DB.

Usage:
  python backend/enrich_reviews.py

Cost: ~$0.017 per place (Places Details Basic SKU) — same key as ingestion.
Idempotent: skips places that already have review_snippets.
"""

import asyncio
import os
import sys

import httpx
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

sys.path.insert(0, os.path.dirname(__file__))
from app.db.models import Place  # noqa: E402

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://vybe:vybe@localhost:5432/vybe")
GOOGLE_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")

GOOGLE_DETAIL_URL = "https://places.googleapis.com/v1/places/{place_id}"


async def fetch_google_reviews(client: httpx.AsyncClient, google_place_id: str) -> list[str]:
    try:
        resp = await client.get(
            GOOGLE_DETAIL_URL.format(place_id=google_place_id),
            headers={
                "X-Goog-Api-Key": GOOGLE_API_KEY,
                "X-Goog-FieldMask": "reviews",
            },
            timeout=10,
        )
        resp.raise_for_status()
        reviews = resp.json().get("reviews", [])
        return [
            r["text"]["text"] for r in reviews
            if r.get("text", {}).get("languageCode", "en") == "en" and r.get("text", {}).get("text")
        ][:5]
    except Exception as e:
        print(f"    [error] {e}")
        return []


async def enrich():
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_PLACES_API_KEY not set in .env")
        sys.exit(1)

    engine = create_async_engine(DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        places = (await db.execute(select(Place))).scalars().all()
        to_enrich = [p for p in places if p.google_place_id and not p.review_snippets]
        skipped = len(places) - len(to_enrich)
        print(f"Found {len(places)} places — {len(to_enrich)} to enrich, {skipped} already done or no Google ID\n")

        enriched = 0
        async with httpx.AsyncClient() as client:
            for place in to_enrich:
                print(f"  {place.name}...")
                snippets = await fetch_google_reviews(client, place.google_place_id)
                if snippets:
                    place.review_snippets = snippets
                    db.add(place)
                    enriched += 1
                    print(f"    +{len(snippets)} review(s)")
                else:
                    print(f"    no English reviews found")
                await asyncio.sleep(0.2)

        await db.commit()

    print(f"\nDone. Enriched {enriched} places.")
    print("Next: python ai-worker/generate_vibes.py --regenerate")


if __name__ == "__main__":
    asyncio.run(enrich())
