"""Make tags global (not workspace-scoped)

Revision ID: 005
Revises: 004
Create Date: 2026-06-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_workspace_tag_name", "tags", type_="unique")
    op.drop_index(op.f("ix_tags_workspace_id"), table_name="tags")
    op.drop_constraint("tags_workspace_id_fkey", "tags", type_="foreignkey")
    op.drop_column("tags", "workspace_id")
    op.create_unique_constraint("uq_tag_name", "tags", ["name"])


def downgrade() -> None:
    op.drop_constraint("uq_tag_name", "tags", type_="unique")
    op.add_column("tags", sa.Column("workspace_id", sa.UUID(), nullable=True))
    op.create_foreign_key("tags_workspace_id_fkey", "tags", "workspaces", ["workspace_id"], ["id"], ondelete="CASCADE")
    op.create_index(op.f("ix_tags_workspace_id"), "tags", ["workspace_id"], unique=False)
    op.create_unique_constraint("uq_workspace_tag_name", "tags", ["workspace_id", "name"])
