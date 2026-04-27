from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db.base import get_db
from app.db.models import User
from app.db.models.vibe_feedback import VibeFeedback

router = APIRouter(tags=["vibe-check"])


class VibeFeedbackIn(BaseModel):
    place_id: int
    mood: str
    felt_right: bool


@router.post("/vibe-check")
async def submit_vibe_check(
    body: VibeFeedbackIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    feedback = VibeFeedback(
        user_id=current_user.id,
        place_id=body.place_id,
        mood=body.mood,
        felt_right=body.felt_right,
    )
    db.add(feedback)
    await db.commit()
    return {"status": "recorded"}
