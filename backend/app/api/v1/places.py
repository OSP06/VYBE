from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.base import get_db
from app.db.models import Place, PlaceFood, PlaceVibe, VibeFeedback
from app.schemas.place import PlaceSchema, PlaceVibeSchema
from app.services.ranking import generate_explanation, is_open_now, rank_places

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


def _food_tags(food_row: Optional[PlaceFood]) -> list[str]:
    if not food_row:
        return []
    tags = list(food_row.cuisine_tags or []) + list(food_row.drink_tags or []) + list(food_row.meal_types or [])
    if food_row.serves_coffee: tags.append("coffee")
    if food_row.serves_brunch: tags.append("brunch")
    if food_row.serves_alcohol: tags.append("cocktails")
    return list(dict.fromkeys(tags))  # dedupe, preserve order


def _build_place_schema(place, vibe, food_row, score, mood=None, food=None):
    explanation = generate_explanation(
        vibe.vibe_vector if vibe else None, mood, food
    ) if (mood or food) else None
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
        score=score,
        food_tags=_food_tags(food_row) or None,
        photos=place.photos or None,
        explanation=explanation,
    )


@router.get("/food-tags")
async def get_food_tags(city_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(PlaceFood)
        .join(Place, Place.id == PlaceFood.place_id)
        .where(Place.city_id == city_id)
        .where(Place.is_active == True)
    )
    rows = (await db.execute(stmt)).scalars().all()
    tags: set[str] = set()
    for food_row in rows:
        for t in (food_row.cuisine_tags or []):
            tags.add(t)
        for t in (food_row.drink_tags or []):
            tags.add(t)
        for t in (food_row.meal_types or []):
            tags.add(t)
        if food_row.serves_coffee:  tags.add('coffee')
        if food_row.serves_brunch:  tags.add('brunch')
        if food_row.serves_alcohol: tags.update(['cocktails', 'wine', 'craft_beer'])
    return sorted(tags)


@router.get("/neighborhoods")
async def get_neighborhoods(city_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Place.neighborhood).where(Place.city_id == city_id).where(Place.neighborhood.isnot(None)).distinct()
    result = await db.execute(stmt)
    neighborhoods = sorted([r[0] for r in result.all() if r[0]])
    return neighborhoods


@router.get("/places", response_model=list[PlaceSchema])
async def get_places(
    city_id: int,
    mood: Optional[str] = None,
    food: Optional[str] = None,
    dietary: Optional[str] = None,
    limit: int = 30,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    neighborhood: Optional[str] = None,
    min_score: float = 0.0,
    open_now: bool = False,
    max_distance_km: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[int] = Depends(_optional_user_id),
):
    stmt = (
        select(Place, PlaceVibe, PlaceFood)
        .outerjoin(PlaceVibe, Place.id == PlaceVibe.place_id)
        .outerjoin(PlaceFood, Place.id == PlaceFood.place_id)
        .where(Place.city_id == city_id)
        .where(Place.is_active == True)
    )
    if neighborhood:
        stmt = stmt.where(Place.neighborhood == neighborhood)
    rows = (await db.execute(stmt)).all()

    # Load personalisation signal
    feedback: dict = {}
    if user_id is not None and mood:
        fb_rows = (await db.execute(
            select(VibeFeedback.place_id, VibeFeedback.felt_right)
            .where(VibeFeedback.user_id == user_id)
            .where(VibeFeedback.mood == mood)
        )).all()
        feedback = {r.place_id: r.felt_right for r in fb_rows}

    food_ranked, nofood_ranked = rank_places(
        rows, mood, user_lat=lat, user_lng=lng,
        feedback=feedback, max_distance_km=max_distance_km, food=food, dietary=dietary,
    )

    ranked = [r for r in food_ranked if r[3] >= (0.25 if not food else 0.0)]

    if open_now:
        ranked = [r for r in ranked if is_open_now(r[0].opening_hours)]

    # Food fallback: if mood+food yields < 3 results, use pre-computed nofood list
    if food and len(ranked) < 3:
        ranked = [r for r in nofood_ranked if r[3] >= 0.25]
        if open_now:
            ranked = [r for r in ranked if is_open_now(r[0].opening_hours)]

    return [_build_place_schema(place, vibe, food_row, score, mood=mood, food=food) for place, vibe, food_row, score in ranked[:limit]]


@router.get("/places/{place_id}", response_model=PlaceSchema)
async def get_place(place_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Place, PlaceVibe, PlaceFood)
        .outerjoin(PlaceVibe, Place.id == PlaceVibe.place_id)
        .outerjoin(PlaceFood, Place.id == PlaceFood.place_id)
        .where(Place.id == place_id)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Place not found")
    place, vibe, food_row = row
    return _build_place_schema(place, vibe, food_row, None, mood=None, food=None)
