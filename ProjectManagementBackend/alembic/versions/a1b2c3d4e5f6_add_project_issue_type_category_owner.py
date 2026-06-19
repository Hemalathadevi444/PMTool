"""add_project_issue_type_category_owner

Revision ID: a1b2c3d4e5f6
Revises: 2f816d647e4a
Create Date: 2026-06-19 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '2f816d647e4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add issue_type column (mandatory, default empty string for migration safety)
    op.add_column('projects', sa.Column('issue_type', sa.String(length=100), nullable=True))
    # Add category column (mandatory, default empty string for migration safety)
    op.add_column('projects', sa.Column('category', sa.String(length=100), nullable=True))
    # Add owner_id column (FK to users, nullable to allow migration of existing rows)
    op.add_column('projects', sa.Column('owner_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_projects_owner_id',
        'projects',
        'users',
        ['owner_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_projects_owner_id', 'projects', type_='foreignkey')
    op.drop_column('projects', 'owner_id')
    op.drop_column('projects', 'category')
    op.drop_column('projects', 'issue_type')
