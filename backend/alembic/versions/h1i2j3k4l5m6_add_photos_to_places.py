"""add_photos_to_places

Revision ID: h1i2j3k4l5m6
Revises: b2c3d4e5f6a7
Branch Labels: None
Depends On: None
Create Date: 2026-05-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'h1i2j3k4l5m6'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('places', sa.Column('photos', postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('places', 'photos')
