from typing import Optional

from pydantic import BaseModel, ConfigDict


class VibeVectorSchema(BaseModel):
    calm: float
    aesthetic: float
    lively: float
    social: float
    premium: float
    budget: float
    work_friendly: float
    date_friendly: float


class PlaceVibeSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vibe_vector: dict
    hype_score: float
    summary: str
    crowd: str


class PlaceSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    lat: float
    lng: float
    rating: float
    price_range: int
    address: str
    image_url: Optional[str] = None
    neighborhood: Optional[str] = None
    opening_hours: Optional[list] = None
    vibe: Optional[PlaceVibeSchema] = None
    score: Optional[float] = None
    food_tags: Optional[list] = None
    photos: Optional[list] = None
    explanation: Optional[str] = None


class CitySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    country: str
