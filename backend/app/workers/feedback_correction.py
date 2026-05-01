"""
Vibe Feedback Correction Job — V2.5

Converts aggregate vibe_feedback signal into permanent vibe_vector corrections.
Run manually (or nightly via cron once V4 scheduler exists):

  cd backend && DATABASE_URL="..." python -m app.workers.feedback_correction

Logic:
  - Group vibe_feedback by (place_id, mood) with >= 10 votes
  - felt_right_rate < 0.35 → reduce relevant mood dims by 0.05
  - felt_right_rate > 0.70 → boost relevant mood dims by 0.03
  - All dims clamped to [0.0, 1.0]
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.models.place_vibe import PlaceVibe
from app.db.models.vibe_feedback import VibeFeedback

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://vybe:vybe@localhost:5432/vybe")

MIN_VOTES = 10
CORRECTION_DOWN = 0.05
CORRECTION_UP = 0.03

# Which vibe_vector dims each mood is primarily expressed through
MOOD_TO_DIMS: dict[str, list[str]] = {
    "calm":         ["calm", "work_friendly"],
    "focus":        ["work_friendly", "calm"],
    "romantic":     ["date_friendly", "aesthetic"],
    "social":       ["social", "lively"],
    "energetic":    ["lively", "social"],
    "aesthetic":    ["aesthetic", "calm"],
    "explore":      ["lively", "aesthetic"],
    "budget_chill": ["budget", "calm"],
}


async def run():
    engine = create_async_engine(DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        # Aggregate: (place_id, mood, total_votes, felt_right_count)
        agg = (
            select(
                VibeFeedback.place_id,
                VibeFeedback.mood,
                func.count().label("total"),
                func.sum(func.cast(VibeFeedback.felt_right, type_=type(0))).label("right"),
            )
            .group_by(VibeFeedback.place_id, VibeFeedback.mood)
            .having(func.count() >= MIN_VOTES)
        )
        rows = (await db.execute(agg)).all()
        print(f"Groups with >= {MIN_VOTES} votes: {len(rows)}")

        corrected = 0
        for place_id, mood, total, right in rows:
            felt_right_rate = (right or 0) / total
            dims = MOOD_TO_DIMS.get(mood, [])
            if not dims:
                continue

            if felt_right_rate < 0.35:
                delta = -CORRECTION_DOWN
            elif felt_right_rate > 0.70:
                delta = CORRECTION_UP
            else:
                continue  # within acceptable range, no correction needed

            vibe = await db.get(PlaceVibe, place_id)
            if not vibe or not vibe.vibe_vector:
                continue

            vec = dict(vibe.vibe_vector)
            for dim in dims:
                vec[dim] = round(max(0.0, min(1.0, vec.get(dim, 0.0) + delta)), 4)

            vibe.vibe_vector = vec
            db.add(vibe)
            direction = "↑" if delta > 0 else "↓"
            print(f"  {direction} place_id={place_id} mood={mood} rate={felt_right_rate:.2f} dims={dims}")
            corrected += 1

        await db.commit()
        print(f"\nDone. Corrected {corrected} place-mood pairs.")


if __name__ == "__main__":
    asyncio.run(run())
