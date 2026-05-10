"""add mobile_number to users

Revision ID: 0002_add_mobile
Revises: 0001_init
Create Date: 2026-05-10 15:13:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0002_add_mobile'
down_revision = '0001_init'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add mobile_number column to users table
    op.add_column('users', sa.Column('mobile_number', sa.String(length=20), nullable=True))


def downgrade() -> None:
    # Remove mobile_number column from users table
    op.drop_column('users', 'mobile_number')
