"""add admin_revoked order event action

Revision ID: 0007_add_admin_revoked
Revises: 0006_add_admin_workflow
Create Date: 2026-06-21

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0007_add_admin_revoked"
down_revision: Union[str, None] = "0006_add_admin_workflow"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TYPE order_event_action ADD VALUE IF NOT EXISTS 'ADMIN_REVOKED'")


def downgrade() -> None:
    pass
