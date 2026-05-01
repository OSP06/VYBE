"""
Place Freshness Checks — V2.7

Nightly job that re-fetches each place from Google Places API to detect:
  - Permanently closed places → marks is_active = False
  - Rating drift > 0.3 → updates rating, flags for re-vibe

Run manually (or nightly):
  cd backend && DATABASE_URL="..." GOOGLE_PLACES_API_KEY="..." \
    python -m app.workers.freshness_worker
"""
import asyncio
import os
import sys
import time

import httpx
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.models.place import Place

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://vybe:vybe@localhost:5432/vybe")
GOOGLE_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")

PLACES_DETAIL_URL = "https://places.googleapis.com/v1/places/{place_id}"
FIELD_MASK = "id,rating,businessStatus"


async def fetch_place_status(client: httpx.AsyncClient, google_place_id: str) -> dict | None:
    url = PLACES_DETAIL_URL.format(place_id=google_place_id)
    headers = {
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    try:
        resp = await client.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"    [error] {google_place_id}: {e}")
    return None


async def run():
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_PLACES_API_KEY not set")
        sys.exit(1)

    engine = create_async_engine(DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        places = (await db.execute(
            select(Place).where(
                Place.google_place_id.isnot(None),
                Place.is_active == True,
            )
        )).scalars().all()
        print(f"Checking freshness for {len(places)} active places...")

        closed = 0
        updated = 0
        revibe_queue = []

        async with httpx.AsyncClient() as client:
            for place in places:
                data = await fetch_place_status(client, place.google_place_id)
                if not data:
                    continue

                status = data.get("businessStatus", "OPERATIONAL")
                place.business_status = status

                if status == "CLOSED_PERMANENTLY":
                    place.is_active = False
                    db.add(place)
                    print(f"  CLOSED  {place.name}")
                    closed += 1
                else:
                    new_rating = data.get("rating")
                    if new_rating and abs(new_rating - place.rating) > 0.3:
                        print(f"  RATING  {place.name}: {place.rating:.1f} → {new_rating:.1f}")
                        place.rating = new_rating
                        revibe_queue.append(place.id)
                        updated += 1
                    db.add(place)

                await asyncio.sleep(0.2)  # respect Google rate limits

        await db.commit()

    print(f"\nDone. Closed: {closed}. Rating updated: {updated}.")
    if revibe_queue:
        print(f"Places flagged for re-vibe (run generate_vibes.py for these IDs): {revibe_queue}")


if __name__ == "__main__":
    asyncio.run(run())
