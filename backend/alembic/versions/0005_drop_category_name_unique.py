"""drop legacy unique on categories.name for dual catalog

Revision ID: 0005_drop_category_name_unique
Revises: 0004_add_order_form_type
Create Date: 2026-06-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_drop_category_name_unique"
down_revision: Union[str, None] = "0004_add_order_form_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        op.execute(
            """
            CREATE TABLE categories_new (
                id INTEGER NOT NULL,
                name VARCHAR(128) NOT NULL,
                display_order INTEGER DEFAULT '0' NOT NULL,
                catalog_type VARCHAR(7) DEFAULT 'AG_GROW' NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT uq_category_catalog_name UNIQUE (catalog_type, name)
            )
            """
        )
        op.execute(
            "INSERT INTO categories_new (id, name, display_order, catalog_type) "
            "SELECT id, name, display_order, catalog_type FROM categories"
        )
        op.execute("DROP TABLE categories")
        op.execute("ALTER TABLE categories_new RENAME TO categories")
        op.execute("CREATE INDEX IF NOT EXISTS ix_categories_catalog_type ON categories (catalog_type)")
    else:
        with op.batch_alter_table("categories") as batch_op:
            batch_op.drop_constraint("categories_name_key", type_="unique")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        op.execute(
            """
            CREATE TABLE categories_old (
                id INTEGER NOT NULL,
                name VARCHAR(128) NOT NULL,
                display_order INTEGER DEFAULT '0' NOT NULL,
                catalog_type VARCHAR(7) DEFAULT 'AG_GROW' NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT uq_category_catalog_name UNIQUE (catalog_type, name),
                UNIQUE (name)
            )
            """
        )
        op.execute(
            "INSERT INTO categories_old (id, name, display_order, catalog_type) "
            "SELECT id, name, display_order, catalog_type FROM categories"
        )
        op.execute("DROP TABLE categories")
        op.execute("ALTER TABLE categories_old RENAME TO categories")
        op.execute("CREATE INDEX IF NOT EXISTS ix_categories_catalog_type ON categories (catalog_type)")
    else:
        with op.batch_alter_table("categories") as batch_op:
            batch_op.create_unique_constraint("categories_name_key", ["name"])
