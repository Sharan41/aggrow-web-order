"""add order form type and dual catalog support

Revision ID: 0004_add_order_form_type
Revises: 0003_add_order_product_remarks
Create Date: 2026-06-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0004_add_order_form_type"
down_revision: Union[str, None] = "0003_add_order_product_remarks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

order_form_type = sa.Enum("AG_GROW", "SULFAG", name="order_form_type")


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in {c["name"] for c in inspect(bind).get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    order_form_type.create(bind, checkfirst=True)

    if not _has_column("orders", "order_form_type"):
        with op.batch_alter_table("orders") as batch_op:
            batch_op.add_column(
                sa.Column(
                    "order_form_type",
                    order_form_type,
                    nullable=False,
                    server_default="AG_GROW",
                )
            )
            batch_op.create_index("ix_orders_order_form_type", ["order_form_type"])

    if not _has_column("categories", "catalog_type"):
        with op.batch_alter_table("categories") as batch_op:
            batch_op.add_column(
                sa.Column(
                    "catalog_type",
                    order_form_type,
                    nullable=False,
                    server_default="AG_GROW",
                )
            )
            batch_op.create_index("ix_categories_catalog_type", ["catalog_type"])
            batch_op.create_unique_constraint("uq_category_catalog_name", ["catalog_type", "name"])


def downgrade() -> None:
    bind = op.get_bind()

    if _has_column("categories", "catalog_type"):
        with op.batch_alter_table("categories") as batch_op:
            batch_op.drop_constraint("uq_category_catalog_name", type_="unique")
            batch_op.drop_index("ix_categories_catalog_type")
            batch_op.drop_column("catalog_type")
            batch_op.create_unique_constraint("categories_name_key", ["name"])

    if _has_column("orders", "order_form_type"):
        with op.batch_alter_table("orders") as batch_op:
            batch_op.drop_index("ix_orders_order_form_type")
            batch_op.drop_column("order_form_type")

    order_form_type.drop(bind, checkfirst=True)
