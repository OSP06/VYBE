from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.db.models import Place, PlaceVibe
from app.schemas.place import PlaceSchema, PlaceVibeSchema
from app.services.ranking import rank_places

router = APIRouter()


@router.get("/neighborhoods")
async def get_neighborhoods(city_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Place.neighborhood).where(Place.city_id == city_id).where(Place.neighborhood.isnot(None)).distinct()
    result = await db.execute(stmt)
    neighborhoods = sorted([r[0] for r in result.all() if r[0]])
    return neighborhoods


@router.get("/places", response_model=list[PlaceSchema])
async def get_places(
    city_id: int,
    mood: str,
    limit: int = 30,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    neighborhood: Optional[str] = None,
    min_score: float = 0.25,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Place, PlaceVibe)
        .outerjoin(PlaceVibe, Place.id == PlaceVibe.place_id)
        .where(Place.city_id == city_id)
    )
    if neighborhood:
        stmt = stmt.where(Place.neighborhood == neighborhood)
    rows = (await db.execute(stmt)).all()
    ranked = [r for r in rank_places(rows, mood, user_lat=lat, user_lng=lng) if r[2] >= min_score][:limit]
    out = []
    for place, vibe, score in ranked:
        p = PlaceSchema(
            id=place.id,
            name=place.name,
            lat=place.lat,
            lng=place.lng,
            rating=place.rating,
            price_range=place.price_range,
            address=place.address,
            image_url=place.image_url,
            neighborhood=place.neighborhood,
            vibe=PlaceVibeSchema.model_validate(vibe) if vibe else None,
            score=score,
        )
        out.append(p)
    return out


@router.get("/places/{place_id}", response_model=PlaceSchema)
async def get_place(place_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Place, PlaceVibe)
        .outerjoin(PlaceVibe, Place.id == PlaceVibe.place_id)
        .where(Place.id == place_id)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Place not found")
    place, vibe = row
    return PlaceSchema(
        id=place.id,
        name=place.name,
        lat=place.lat,
        lng=place.lng,
        rating=place.rating,
        price_range=place.price_range,
        address=place.address,
        image_url=place.image_url,
        neighborhood=place.neighborhood,
        vibe=PlaceVibeSchema.model_validate(vibe) if vibe else None,
        score=None,
    )
