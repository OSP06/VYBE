from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from .place import Place
    from .user import User


class SavedPlace(Base):
    __tablename__ = "saved_places"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    place_id: Mapped[int] = mapped_column(ForeignKey("places.id"), primary_key=True)
    saved_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="saves")
    place: Mapped["Place"] = relationship(back_populates="saves")
