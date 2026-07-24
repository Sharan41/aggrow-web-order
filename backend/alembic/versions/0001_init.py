"""initial schema

Revision ID: 0001_init
Revises:
Create Date: 2026-05-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.models._types import JSONType

revision: str = "0001_init"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "branches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("address", sa.String(512), nullable=True),
    )

    user_role = sa.Enum("CUSTOMER", "HEAD_OFFICE", "FACTORY", name="user_role")
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column(
            "branch_id",
            sa.Integer(),
            sa.ForeignKey("branches.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False, unique=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "packing_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("categories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("column_headers", JSONType(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_packing_groups_category_id", "packing_groups", ["category_id"])

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "packing_group_id",
            sa.Integer(),
            sa.ForeignKey("packing_groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("s_no", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(512), nullable=False),
        sa.Column("packing_type", sa.String(128), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_products_packing_group_id", "products", ["packing_group_id"])

    op.create_table(
        "product_packings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "product_id",
            sa.Integer(),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("size_label", sa.String(64), nullable=False),
        sa.Column("available", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("product_id", "size_label", name="uq_productpacking_product_size"),
    )
    op.create_index("ix_product_packings_product_id", "product_packings", ["product_id"])

    order_status = sa.Enum(
        "DRAFT",
        "SUBMITTED_TO_HO",
        "HO_FORWARDED",
        "FACTORY_RESPONDED",
        "COMPLETED",
        "REJECTED",
        name="order_status",
    )
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "customer_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "branch_id",
            sa.Integer(),
            sa.ForeignKey("branches.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", order_status, nullable=False, server_default="DRAFT"),
        sa.Column("customer_note", sa.Text(), nullable=True),
        sa.Column("ho_note", sa.Text(), nullable=True),
        sa.Column("factory_note", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ho_forwarded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("factory_responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_status", "orders", ["status"])

    op.create_table(
        "order_items",
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
        sa.Column("size_label", sa.String(64), nullable=False),
        sa.Column("customer_qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ho_qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("factory_available", sa.Boolean(), nullable=True),
        sa.Column("factory_item_note", sa.String(1024), nullable=True),
        sa.UniqueConstraint("order_id", "product_id", "size_label", name="uq_orderitem_line"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])

    order_event_action = sa.Enum(
        "CREATED",
        "CUSTOMER_SUBMITTED",
        "HO_EDITED",
        "HO_FORWARDED",
        "HO_REJECTED",
        "FACTORY_RESPONDED",
        "COMPLETED",
        name="order_event_action",
    )
    op.create_table(
        "order_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "order_id",
            sa.Integer(),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "actor_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", order_event_action, nullable=False),
        sa.Column("payload", JSONType(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_order_events_order_id", "order_events", ["order_id"])

    notification_type = sa.Enum(
        "ORDER_SUBMITTED",
        "ORDER_FORWARDED",
        "ORDER_RESPONDED",
        "ORDER_COMPLETED",
        "ORDER_REJECTED",
        name="notification_type",
    )
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "order_id",
            sa.Integer(),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("type", notification_type, nullable=False),
        sa.Column("message", sa.String(1024), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_order_events_order_id", table_name="order_events")
    op.drop_table("order_events")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_status", table_name="orders")
    op.drop_index("ix_orders_customer_id", table_name="orders")
    op.drop_table("orders")
    op.drop_index("ix_product_packings_product_id", table_name="product_packings")
    op.drop_table("product_packings")
    op.drop_index("ix_products_packing_group_id", table_name="products")
    op.drop_table("products")
    op.drop_index("ix_packing_groups_category_id", table_name="packing_groups")
    op.drop_table("packing_groups")
    op.drop_table("categories")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("branches")

    for enum_name in (
        "notification_type",
        "order_event_action",
        "order_status",
        "user_role",
    ):
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
