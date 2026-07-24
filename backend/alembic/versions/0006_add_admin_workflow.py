"""add admin role and admin workflow layer

Revision ID: 0006_add_admin_workflow
Revises: 0005_drop_category_name_unique
Create Date: 2026-06-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0006_add_admin_workflow"
down_revision: Union[str, None] = "0005_drop_category_name_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in {c["name"] for c in inspect(bind).get_columns(table)}


def _is_postgres() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def upgrade() -> None:
    bind = op.get_bind()

    if _is_postgres():
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN'")
        op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'SUBMITTED_TO_ADMIN'")
        op.execute("ALTER TYPE order_event_action ADD VALUE IF NOT EXISTS 'HO_FORWARDED_TO_ADMIN'")
        op.execute("ALTER TYPE order_event_action ADD VALUE IF NOT EXISTS 'ADMIN_EDITED'")
        op.execute("ALTER TYPE order_event_action ADD VALUE IF NOT EXISTS 'ADMIN_FORWARDED'")
        op.execute("ALTER TYPE order_event_action ADD VALUE IF NOT EXISTS 'ADMIN_REJECTED'")

    if not _has_column("orders", "admin_note"):
        with op.batch_alter_table("orders") as batch_op:
            batch_op.add_column(sa.Column("admin_note", sa.Text(), nullable=True))
            batch_op.add_column(sa.Column("admin_forwarded_at", sa.DateTime(timezone=True), nullable=True))
            batch_op.add_column(sa.Column("ho_reviewer_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_orders_ho_reviewer_id_users",
                "users",
                ["ho_reviewer_id"],
                ["id"],
                ondelete="SET NULL",
            )
            batch_op.create_index("ix_orders_ho_reviewer_id", ["ho_reviewer_id"])


def downgrade() -> None:
    if _has_column("orders", "admin_note"):
        with op.batch_alter_table("orders") as batch_op:
            batch_op.drop_index("ix_orders_ho_reviewer_id")
            batch_op.drop_constraint("fk_orders_ho_reviewer_id_users", type_="foreignkey")
            batch_op.drop_column("ho_reviewer_id")
            batch_op.drop_column("admin_forwarded_at")
            batch_op.drop_column("admin_note")

    # PostgreSQL enum values cannot be removed safely without recreating types.
