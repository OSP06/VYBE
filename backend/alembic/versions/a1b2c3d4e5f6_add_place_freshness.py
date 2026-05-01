"""add_place_freshness

Revision ID: a1b2c3d4e5f6
Revises: f8a9b0c1d2e3
Create Date: 2026-05-01 10:02:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f8a9b0c1d2e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('places', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('places', sa.Column('business_status', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('places', 'business_status')
    op.drop_column('places', 'is_active')
