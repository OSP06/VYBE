"""
AI Worker — generates vibe vectors for all places using GPT-4o-mini.

Usage:
  python ai-worker/generate_vibes.py
  python ai-worker/generate_vibes.py --regenerate   # re-score even existing vibes

Idempotent by default: skips places that already have a vibe entry.
--regenerate deletes existing vibes and re-scores from scratch.
"""
import argparse
import asyncio
import json
import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from dotenv import load_dotenv
from openai import AsyncOpenAI
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

from app.db.models import Place, PlaceVibe  # noqa: E402

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://vybe:vybe@localhost:5432/vybe")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

ATMOSPHERE_KEYWORDS = [
    'quiet', 'noisy', 'loud', 'lighting', 'lit', 'dim', 'bright',
    'vibe', 'atmosphere', 'crowd', 'crowded', 'busy', 'packed', 'empty',
    'music', 'cozy', 'cosy', 'ambiance', 'ambience', 'decor', 'seating',
    'intimate', 'spacious', 'airy', 'warm', 'cool', 'aesthetic',
]

PRICE_BOOSTS = {
    "PRICE_LEVEL_FREE":          {"budget": 0.25},
    "PRICE_LEVEL_INEXPENSIVE":   {"budget": 0.25},
    "PRICE_LEVEL_EXPENSIVE":     {"premium": 0.2},
    "PRICE_LEVEL_VERY_EXPENSIVE": {"premium": 0.2},
}


def recency_weight(date_str: str) -> float:
    if not date_str:
        return 0.5
    try:
        review_date = date.fromisoformat(date_str)
        months_ago = (date.today() - review_date).days / 30
        if months_ago <= 6:
            return 1.0
        if months_ago <= 18:
            return 0.7
        return 0.4
    except Exception:
        return 0.5


def quality_score(review: dict) -> float:
    text = review.get("text", "") if isinstance(review, dict) else str(review)
    words = text.split()
    if len(words) < 20:
        return 0.0
    mentions = any(w in text.lower() for w in ATMOSPHERE_KEYWORDS)
    return len(words) * (1.5 if mentions else 1.0)


def apply_price_boost(vibe_vector: dict, place_attributes: dict | None) -> dict:
    if not place_attributes:
        return vibe_vector
    v = dict(vibe_vector)
    price = place_attributes.get("priceLevel", "")
    for dim, boost in PRICE_BOOSTS.get(price, {}).items():
        v[dim] = min(1.0, v.get(dim, 0.0) + boost)
    return v


def build_prompt(name: str, address: str, reviews: list | None = None) -> str:
    review_block = ""
    if reviews:
        # Normalise: handle both old format (list of str) and new (list of dict)
        normalized = []
        for r in reviews:
            if isinstance(r, dict):
                normalized.append(r)
            else:
                normalized.append({"text": str(r), "date": ""})

        # Filter by quality, sort by recency (most recent first)
        filtered = [r for r in normalized if quality_score(r) > 0]
        filtered.sort(key=lambda r: recency_weight(r.get("date", "")), reverse=True)
        top = filtered[:10]

        if top:
            joined = "\n".join(f'- "{r["text"][:300]}"' for r in top)
            review_block = f"\n\nAtmosphere-relevant user reviews (recent weighted higher):\n{joined}"

    return f"""You are a place vibe analyst for a mood-based discovery app.
Analyze the ATMOSPHERE ONLY of "{name}" located at "{address}".{review_block}

IGNORE completely: food quality, menu items, drinks, service speed, staff friendliness, prices, wait times, value for money.
FOCUS ONLY ON: lighting quality, noise level, crowd density, music type and volume, seating comfort and layout, interior decor, time-of-day feel, overall ambiance and energy.

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
  "summary": "<2-sentence evocative description of the physical space and atmosphere>",
  "crowd": "<one of: students/couples/families/professionals/locals/tourists/mixed>"
}}

Dimension definitions (atmosphere only):
- calm: ambient quietness and relaxed pace of the space
- aesthetic: visual appeal, decor quality, instagrammability
- lively: energy, music volume, activity level, buzz
- social: open layout and group-friendliness of the space
- premium: luxury feel of the interior (not price)
- budget: casual, unpretentious, neighbourhood-feel
- work_friendly: seating for laptops, noise level suitable for focus
- date_friendly: intimacy, lighting quality, romantic ambiance"""


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

                boosted_vector = apply_price_boost(data["vibe_vector"], place.place_attributes)

                vibe = PlaceVibe(
                    place_id=place.id,
                    vibe_vector=boosted_vector,
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
