"""
Resolve stored Google Places photo redirect URLs to direct lh3.googleusercontent.com CDN URLs.
Run once: python backend/fix_photo_urls.py
"""
import asyncio
import os
import sys
import httpx
from sqlalchemy import select, update

sys.path.insert(0, os.path.dirname(__file__))

from app.db.base import AsyncSessionLocal as async_session
from app.db.models import Place


def resolve_url(url: str, client: httpx.Client) -> str:
    if "lh3.googleusercontent.com" in url:
        return url  # already resolved
    try:
        r = client.get(url, follow_redirects=False, timeout=10)
        if r.status_code in (301, 302, 303, 307, 308):
            return r.headers["location"]
    except Exception as e:
        print(f"  ERROR: {e}")
    return url


async def main():
    async with async_session() as db:
        result = await db.execute(
            select(Place.id, Place.image_url)
            .where(Place.image_url.isnot(None))
            .where(Place.image_url.like("%places.googleapis.com%"))
        )
        rows = result.all()

    print(f"Resolving {len(rows)} photo URLs...")

    with httpx.Client() as client:
        updates = []
        for place_id, url in rows:
            resolved = resolve_url(url, client)
            if resolved != url:
                updates.append({"id": place_id, "image_url": resolved})
                print(f"  [{place_id}] ✓ resolved")
            else:
                print(f"  [{place_id}] unchanged")

    if updates:
        async with async_session() as db:
            for u in updates:
                await db.execute(
                    update(Place).where(Place.id == u["id"]).values(image_url=u["image_url"])
                )
            await db.commit()
        print(f"\nUpdated {len(updates)} rows.")
    else:
        print("\nNothing to update.")


if __name__ == "__main__":
    asyncio.run(main())
