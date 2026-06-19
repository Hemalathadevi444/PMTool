"""Add tag_id to projects

Revision ID: 006
Revises: 005
Create Date: 2026-06-15
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "e788a1a99be3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("tag_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "projects_tag_id_fkey",
        "projects",
        "tags",
        ["tag_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_projects_tag_id"), "projects", ["tag_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_projects_tag_id"), table_name="projects")
    op.drop_constraint("projects_tag_id_fkey", "projects", type_="foreignkey")
    op.drop_column("projects", "tag_id")
