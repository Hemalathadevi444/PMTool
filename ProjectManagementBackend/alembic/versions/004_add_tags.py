"""Add tags table and tag_id on tasks

Revision ID: 004
Revises: 003
Create Date: 2026-06-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=False, server_default="#8b5cf6"),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "name", name="uq_workspace_tag_name"),
    )
    op.create_index(op.f("ix_tags_workspace_id"), "tags", ["workspace_id"], unique=False)

    op.add_column(
        "tasks",
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_tasks_tag_id",
        "tasks",
        "tags",
        ["tag_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_tasks_tag_id"), "tasks", ["tag_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tasks_tag_id"), table_name="tasks")
    op.drop_constraint("fk_tasks_tag_id", "tasks", type_="foreignkey")
    op.drop_column("tasks", "tag_id")
    op.drop_index(op.f("ix_tags_workspace_id"), table_name="tags")
    op.drop_table("tags")
