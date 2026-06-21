"""add admin_reviewer_id to orders

Revision ID: 0008_add_admin_reviewer
Revises: 0007_add_admin_revoked
Create Date: 2026-06-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_add_admin_reviewer"
down_revision: Union[str, None] = "0007_add_admin_revoked"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(sa.Column("admin_reviewer_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_orders_admin_reviewer_id_users",
            "users",
            ["admin_reviewer_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index("ix_orders_admin_reviewer_id", ["admin_reviewer_id"])


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_index("ix_orders_admin_reviewer_id")
        batch_op.drop_constraint("fk_orders_admin_reviewer_id_users", type_="foreignkey")
        batch_op.drop_column("admin_reviewer_id")
