"""
AI Worker — generates vibe vectors for all places using GPT-4o-mini.

Usage:
  python ai-worker/generate_vibes.py
  python ai-worker/generate_vibes.py --regenerate   # re-score even existing vibes

Idempotent by default: skips places that already have a vibe entry.
--regenerate deletes existing vibes and re-scores from scratch (useful after
running enrich_reviews.py to get review-calibrated scores).
"""
import argparse
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from dotenv import load_dotenv
from openai import AsyncOpenAI
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

from app.db.models import Place, PlaceVibe  # noqa: E402 — needs sys.path set first

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://vybe:vybe@localhost:5432/vybe")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


def build_prompt(name: str, address: str, reviews: list | None = None) -> str:
    review_block = ""
    if reviews:
        joined = "\n".join(f'- "{r[:300]}"' for r in reviews[:8])
        review_block = (
            f"\n\nReal user reviews (use these to calibrate your scores — "
            f"they reflect what people actually experience):\n{joined}"
        )

    return f"""You are a place vibe analyst for a mood-based discovery app.
Analyze "{name}" located at "{address}".{review_block}

Return ONLY valid JSON — no markdown, no explanation:
{{
  "vibe_vector": {{
    "calm": <0.0-1.0>,
    "aesthetic": <0.0-1.0>,
    "lively": <0.0-1.0>,
    "social": <0.0-1.0>,
    "premium": <0.0-1.0>,
    "budget": <0.0-1.0>,
    "work_friendly": <0.0-1.0>,
    "date_friendly": <0.0-1.0>
  }},
  "hype_score": <0.0-1.0>,
  "summary": "<2-sentence evocative description>",
  "crowd": "<one of: students/couples/families/professionals/locals/tourists/mixed>"
}}

Dimension definitions:
- calm: ambient quietness and relaxed pace
- aesthetic: visual appeal, decor quality, instagrammability
- lively: energy, music, buzz, activity level
- social: group-friendliness, open layout encouraging conversation
- premium: price point and luxury feel (high = expensive)
- budget: affordability and value (high = cheap and cheerful)
- work_friendly: wifi quality, good seating, noise level for laptops
- date_friendly: intimacy, lighting, romantic ambiance"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
async def get_vibe(client: AsyncOpenAI, place: Place) -> dict:
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": build_prompt(place.name, place.address, place.review_snippets)}],
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


async def main(regenerate: bool):
    if not OPENAI_API_KEY:
        print("ERROR: OPENAI_API_KEY not set. Export it or add to ../.env")
        sys.exit(1)

    engine = create_async_engine(DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    async with Session() as db:
        places = (await db.execute(select(Place))).scalars().all()
        print(f"Found {len(places)} places to process")
        if regenerate:
            print("--regenerate: deleting all existing vibe rows first")
            await db.execute(delete(PlaceVibe))
            await db.commit()

        for place in places:
            if not regenerate:
                existing = await db.get(PlaceVibe, place.id)
                if existing:
                    print(f"  SKIP  {place.name} (already has vibe)")
                    continue

            has_reviews = bool(place.review_snippets)
            print(f"  PROC  {place.name}{'  [+reviews]' if has_reviews else ''}...")
            try:
                data = await get_vibe(client, place)
                vibe = PlaceVibe(
                    place_id=place.id,
                    vibe_vector=data["vibe_vector"],
                    hype_score=float(data["hype_score"]),
                    summary=data["summary"],
                    crowd=data["crowd"],
                )
                db.add(vibe)
                await db.commit()
                print(f"  DONE  {place.name} — crowd: {data['crowd']}, hype: {data['hype_score']}")
            except Exception as e:
                print(f"  FAIL  {place.name}: {e}")
            await asyncio.sleep(0.3)

    print("\nDone. All places processed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--regenerate",
        action="store_true",
        help="Delete existing vibe rows and re-score all places from scratch",
    )
    args = parser.parse_args()
    asyncio.run(main(args.regenerate))
