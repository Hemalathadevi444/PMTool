from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole


class WorkspaceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, workspace_id: UUID) -> Workspace | None:
        result = await self.db.execute(
            select(Workspace)
            .options(selectinload(Workspace.members))
            .where(Workspace.id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Workspace | None:
        result = await self.db.execute(
            select(Workspace)
            .where(func.lower(Workspace.name) == func.lower(name))
        )
        return result.scalar_one_or_none()

    async def create(self, workspace: Workspace) -> Workspace:
        self.db.add(workspace)
        await self.db.flush()
        await self.db.refresh(workspace)
        return workspace

    async def update(self, workspace: Workspace) -> Workspace:
        await self.db.flush()
        await self.db.refresh(workspace)
        return workspace

    async def add_member(self, member: WorkspaceMember) -> WorkspaceMember:
        self.db.add(member)
        await self.db.flush()
        return member

    async def is_member(self, workspace_id: UUID, user_id: UUID) -> bool:
        result = await self.db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def list_for_user(self, user_id: UUID, skip: int = 0, limit: int = 20) -> tuple[list[Workspace], int]:
        member_workspace_ids = select(WorkspaceMember.workspace_id).where(
            WorkspaceMember.user_id == user_id
        )
        base_query = select(Workspace).where(
            or_(Workspace.owner_id == user_id, Workspace.id.in_(member_workspace_ids))
        )
        count_result = await self.db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total = count_result.scalar_one()

        result = await self.db.execute(
            base_query.order_by(Workspace.updated_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def list_all(self, skip: int = 0, limit: int = 20) -> tuple[list[Workspace], int]:
        base_query = select(Workspace)
        count_result = await self.db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total = count_result.scalar_one()

        result = await self.db.execute(
            base_query.order_by(Workspace.updated_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def create_member(
        self, workspace_id: UUID, user_id: UUID, role: WorkspaceRole = WorkspaceRole.MEMBER
    ) -> WorkspaceMember:
        member = WorkspaceMember(workspace_id=workspace_id, user_id=user_id, role=role)
        return await self.add_member(member)
