from datetime import datetime
from sqlalchemy import Boolean, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class VibeFeedback(Base):
    __tablename__ = "vibe_feedback"
    __table_args__ = (
        Index("ix_vf_user_mood", "user_id", "mood"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    place_id: Mapped[int] = mapped_column(ForeignKey("places.id"))
    mood: Mapped[str] = mapped_column(String(50))
    felt_right: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
