from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.base import get_db
from app.db.models import Place, PlaceVibe, VibeFeedback
from app.schemas.place import PlaceSchema, PlaceVibeSchema
from app.services.ranking import is_open_now, rank_places

router = APIRouter()

_optional_bearer = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def _optional_user_id(token: Optional[str] = Depends(_optional_bearer)) -> Optional[int]:
    """Returns user_id if a valid JWT is present, None otherwise."""
    if not token:
        return None
    try:
        return decode_token(token)
    except Exception:
        return None


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
    open_now: bool = False,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[int] = Depends(_optional_user_id),
):
    stmt = (
        select(Place, PlaceVibe)
        .outerjoin(PlaceVibe, Place.id == PlaceVibe.place_id)
        .where(Place.city_id == city_id)
    )
    if neighborhood:
        stmt = stmt.where(Place.neighborhood == neighborhood)
    rows = (await db.execute(stmt)).all()

    # Load personalisation signal: past vibe-check votes for this user + mood
    feedback: dict = {}
    if user_id is not None:
        fb_rows = (await db.execute(
            select(VibeFeedback.place_id, VibeFeedback.felt_right)
            .where(VibeFeedback.user_id == user_id)
            .where(VibeFeedback.mood == mood)
        )).all()
        # Most recent vote wins if there are duplicates; last row in list used
        feedback = {r.place_id: r.felt_right for r in fb_rows}

    all_ranked = [r for r in rank_places(rows, mood, user_lat=lat, user_lng=lng, feedback=feedback) if r[2] >= min_score]
    if open_now:
        all_ranked = [r for r in all_ranked if is_open_now(r[0].opening_hours)]
    ranked = all_ranked[:limit]
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
            opening_hours=place.opening_hours,
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
        opening_hours=place.opening_hours,
        vibe=PlaceVibeSchema.model_validate(vibe) if vibe else None,
        score=None,
    )
