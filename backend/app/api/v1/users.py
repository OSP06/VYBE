from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db.base import get_db
from app.db.models import User

router = APIRouter()


class PreferencesRequest(BaseModel):
    preferred_vibes: dict


@router.post("/user/preferences")
async def set_preferences(
    body: PreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.preferred_vibes = body.preferred_vibes
    await db.commit()
    return {"status": "updated"}
