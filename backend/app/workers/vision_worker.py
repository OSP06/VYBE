"""
Vision-Based Vibe Scoring — V2.6

Runs GPT-4o on each place's best interior photo and stores a vision_vibe_vector.
Ranking blends: final_vec = review_vec * 0.6 + vision_vec * 0.4

Run manually after ingest:
  cd backend && DATABASE_URL="..." OPENAI_API_KEY="..." GOOGLE_PLACES_API_KEY="..." \
    python -m app.workers.vision_worker

Cost: ~$0.003 per image. 240 places ≈ $0.72 one-time.
"""
import asyncio
import base64
import json
import os
import sys

import httpx
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from tenacity import retry, stop_after_attempt, wait_exponential

from app.db.models.place import Place
from app.db.models.place_vibe import PlaceVibe

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://vybe:vybe@localhost:5432/vybe")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GOOGLE_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")

VISION_PROMPT = """You are analyzing a photo of a cafe or restaurant interior for a mood-based discovery app.
Score only what you can see in the image — the physical space, lighting, and atmosphere.

Return ONLY valid JSON:
{
  "calm": <0.0-1.0>,
  "aesthetic": <0.0-1.0>,
  "lively": <0.0-1.0>,
  "social": <0.0-1.0>,
  "premium": <0.0-1.0>,
  "budget": <0.0-1.0>,
  "work_friendly": <0.0-1.0>,
  "date_friendly": <0.0-1.0>
}

Guidelines:
- calm: how quiet and relaxed the space looks
- aesthetic: visual beauty, decor quality, instagrammability
- lively: energy, crowdedness, activity visible
- social: open group-friendly layout
- premium: luxury feel of the interior
- budget: casual, unpretentious look
- work_friendly: good seating for laptops, not too noisy-looking
- date_friendly: intimate lighting, romantic feel"""


def blend_vectors(review_vec: dict, vision_vec: dict, review_weight: float = 0.6) -> dict:
    dims = ["calm", "aesthetic", "lively", "social", "premium", "budget", "work_friendly", "date_friendly"]
    vision_weight = 1.0 - review_weight
    return {
        d: round(review_vec.get(d, 0.0) * review_weight + vision_vec.get(d, 0.0) * vision_weight, 4)
        for d in dims
    }


async def fetch_photo_bytes(client: httpx.AsyncClient, image_url: str) -> bytes | None:
    try:
        resp = await client.get(image_url, follow_redirects=True, timeout=15)
        if resp.status_code == 200:
            return resp.content
    except Exception:
        pass
    return None


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
async def score_image(openai_client: AsyncOpenAI, image_bytes: bytes) -> dict:
    b64 = base64.b64encode(image_bytes).decode()
    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": VISION_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"}},
            ],
        }],
        max_tokens=256,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


async def run():
    if not OPENAI_API_KEY:
        print("ERROR: OPENAI_API_KEY not set")
        sys.exit(1)

    engine = create_async_engine(DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    async with Session() as db:
        places = (await db.execute(
            select(Place).where(Place.image_url.isnot(None), Place.is_active == True)
        )).scalars().all()
        print(f"Places with images: {len(places)}")

        async with httpx.AsyncClient() as http:
            for place in places:
                vibe = await db.get(PlaceVibe, place.id)
                if not vibe:
                    print(f"  SKIP  {place.name} (no vibe row)")
                    continue
                if vibe.vision_vibe_vector:
                    print(f"  SKIP  {place.name} (vision already scored)")
                    continue

                print(f"  PROC  {place.name}...")
                image_bytes = await fetch_photo_bytes(http, place.image_url)
                if not image_bytes:
                    print(f"  FAIL  {place.name}: could not fetch image")
                    continue

                try:
                    vision_vec = await score_image(openai_client, image_bytes)
                    vibe.vision_vibe_vector = vision_vec

                    # Blend review + vision vectors and update the primary vibe_vector
                    if vibe.vibe_vector:
                        vibe.vibe_vector = blend_vectors(vibe.vibe_vector, vision_vec)

                    db.add(vibe)
                    await db.commit()
                    print(f"  DONE  {place.name}")
                except Exception as e:
                    print(f"  FAIL  {place.name}: {e}")

                await asyncio.sleep(0.5)

    print("\nDone. Vision scoring complete.")


if __name__ == "__main__":
    asyncio.run(run())
