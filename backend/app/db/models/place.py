from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from .city import City
    from .place_vibe import PlaceVibe
    from .saved_place import SavedPlace


class Place(Base):
    __tablename__ = "places"
    __table_args__ = (Index("ix_places_city_id", "city_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"))
    name: Mapped[str] = mapped_column(String(200))
    lat: Mapped[float]
    lng: Mapped[float]
    rating: Mapped[float]
    price_range: Mapped[int]
    address: Mapped[str] = mapped_column(String(300))
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_place_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, unique=True)
    neighborhood: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    city: Mapped["City"] = relationship(back_populates="places")
    vibe: Mapped[Optional["PlaceVibe"]] = relationship(back_populates="place", uselist=False)
    saves: Mapped[List["SavedPlace"]] = relationship(back_populates="place")
