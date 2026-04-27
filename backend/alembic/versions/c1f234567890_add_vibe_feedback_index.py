"""add_vibe_feedback_index

Revision ID: c1f234567890
Revises: ab1450978605
Create Date: 2026-04-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'c1f234567890'
down_revision: Union[str, None] = 'ab1450978605'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_vf_user_mood', 'vibe_feedback', ['user_id', 'mood'])


def downgrade() -> None:
    op.drop_index('ix_vf_user_mood', table_name='vibe_feedback')
