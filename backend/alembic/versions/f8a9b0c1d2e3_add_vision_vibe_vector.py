"""add_vision_vibe_vector

Revision ID: f8a9b0c1d2e3
Revises: e2f3a4b5c6d7
Create Date: 2026-05-01 10:01:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'f8a9b0c1d2e3'
down_revision: Union[str, None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('place_vibes', sa.Column('vision_vibe_vector', JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('place_vibes', 'vision_vibe_vector')
