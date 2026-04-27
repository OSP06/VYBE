from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from .place import Place


class PlaceVibe(Base):
    __tablename__ = "place_vibes"

    place_id: Mapped[int] = mapped_column(ForeignKey("places.id"), primary_key=True)
    vibe_vector: Mapped[dict] = mapped_column(JSONB)
    hype_score: Mapped[float]
    summary: Mapped[str] = mapped_column(String(500))
    crowd: Mapped[str] = mapped_column(String(100))

    place: Mapped["Place"] = relationship(back_populates="vibe")
