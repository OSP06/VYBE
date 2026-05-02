"""add_place_food

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'place_food',
        sa.Column('place_id', sa.Integer(), sa.ForeignKey('places.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('cuisine_tags', postgresql.ARRAY(sa.TEXT()), nullable=True),
        sa.Column('drink_tags', postgresql.ARRAY(sa.TEXT()), nullable=True),
        sa.Column('meal_types', postgresql.ARRAY(sa.TEXT()), nullable=True),
        sa.Column('serves_coffee', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('serves_brunch', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('serves_alcohol', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('serves_vegetarian', sa.Boolean(), server_default='false', nullable=False),
    )
    op.create_index('ix_place_food_cuisine', 'place_food', ['cuisine_tags'], postgresql_using='gin')

    # Backfill from existing place_attributes for current SF places
    op.execute("""
        INSERT INTO place_food (place_id, serves_coffee, serves_brunch, serves_alcohol)
        SELECT
            id,
            COALESCE((place_attributes->>'servesCoffee')::boolean, false),
            COALESCE((place_attributes->>'servesBrunch')::boolean, false),
            COALESCE((place_attributes->>'servesCocktails')::boolean, false)
        FROM places
        WHERE place_attributes IS NOT NULL
        ON CONFLICT (place_id) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_index('ix_place_food_cuisine', table_name='place_food')
    op.drop_table('place_food')
