"""add dietary_tags to place_food

Revision ID: i2j3k4l5m6n7
Revises: h1i2j3k4l5m6
Create Date: 2026-05-03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'i2j3k4l5m6n7'
down_revision = 'h1i2j3k4l5m6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'place_food',
        sa.Column('dietary_tags', postgresql.ARRAY(sa.Text()), nullable=True),
    )


def downgrade():
    op.drop_column('place_food', 'dietary_tags')
