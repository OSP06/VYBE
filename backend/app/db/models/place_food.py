from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, TEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlaceFood(Base):
    __tablename__ = "place_food"

    place_id: Mapped[int] = mapped_column(
        ForeignKey("places.id", ondelete="CASCADE"), primary_key=True
    )
    cuisine_tags: Mapped[Optional[list]] = mapped_column(ARRAY(TEXT), nullable=True)
    drink_tags: Mapped[Optional[list]] = mapped_column(ARRAY(TEXT), nullable=True)
    meal_types: Mapped[Optional[list]] = mapped_column(ARRAY(TEXT), nullable=True)
    serves_coffee: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    serves_brunch: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    serves_alcohol: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    serves_vegetarian: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
