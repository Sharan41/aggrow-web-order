"""add order product remarks

Revision ID: 0003_add_order_product_remarks
Revises: 0002_add_mobile
Create Date: 2026-06-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_order_product_remarks"
down_revision: Union[str, None] = "0002_add_mobile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "order_product_remarks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "order_id",
            sa.Integer(),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            sa.Integer(),
            sa.ForeignKey("products.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("remarks", sa.String(255), nullable=True),
        sa.UniqueConstraint("order_id", "product_id", name="uq_order_product_remark"),
    )
    op.create_index("ix_order_product_remarks_order_id", "order_product_remarks", ["order_id"])


def downgrade() -> None:
    op.drop_index("ix_order_product_remarks_order_id", table_name="order_product_remarks")
    op.drop_table("order_product_remarks")
