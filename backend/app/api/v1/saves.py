from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.auth import get_current_user
from app.db.base import get_db
from app.db.models import Place, SavedPlace, User
from app.schemas.place import PlaceSchema

router = APIRouter()


class SaveRequest(BaseModel):
    place_id: int


@router.post("/save", status_code=201)
async def save_place(
    body: SaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.get(SavedPlace, (current_user.id, body.place_id))
    if existing:
        return {"status": "already_saved"}
    db.add(SavedPlace(user_id=current_user.id, place_id=body.place_id))
    await db.commit()
    return {"status": "saved"}


@router.delete("/save")
async def unsave_place(
    body: SaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.get(SavedPlace, (current_user.id, body.place_id))
    if existing:
        await db.delete(existing)
        await db.commit()
    return {"status": "removed"}


@router.get("/saved", response_model=list[PlaceSchema])
async def get_saved(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Place)
        .join(SavedPlace, Place.id == SavedPlace.place_id)
        .where(SavedPlace.user_id == current_user.id)
        .options(selectinload(Place.vibe))
        .order_by(SavedPlace.saved_at.desc())
    )
    places = (await db.execute(stmt)).scalars().all()
    return places
