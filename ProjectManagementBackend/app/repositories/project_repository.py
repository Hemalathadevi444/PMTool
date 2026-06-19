from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project


class ProjectRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, project_id: UUID) -> Project | None:
        result = await self.db.execute(
            select(Project)
            .options(selectinload(Project.tags), selectinload(Project.owner))
            .where(Project.id == project_id)
        )
        return result.scalar_one_or_none()

    async def create(self, project: Project) -> Project:
        self.db.add(project)
        await self.db.flush()
        await self.db.refresh(
            project,
            ["name", "description", "workspace_id", "created_by_id", "status",
             "issue_type", "category", "owner_id", "created_at", "updated_at", "tags"],
        )
        # Eagerly load owner after flush
        result = await self.db.execute(
            select(Project)
            .options(selectinload(Project.tags), selectinload(Project.owner))
            .where(Project.id == project.id)
        )
        return result.scalar_one()

    async def update(self, project: Project) -> Project:
        await self.db.flush()
        # Eagerly reload to include all relationships
        result = await self.db.execute(
            select(Project)
            .options(selectinload(Project.tags), selectinload(Project.owner))
            .where(Project.id == project.id)
        )
        return result.scalar_one()

    async def delete(self, project: Project) -> None:
        await self.db.delete(project)
        await self.db.flush()

    async def list_by_workspace(
        self,
        workspace_id: UUID,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
    ) -> tuple[list[Project], int]:
        query = select(Project).where(Project.workspace_id == workspace_id)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(Project.name.ilike(pattern), Project.description.ilike(pattern))
            )

        count_result = await self.db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar_one()

        result = await self.db.execute(
            query.options(selectinload(Project.tags), selectinload(Project.owner))
            .order_by(Project.updated_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def list_all_for_user_workspaces(
        self,
        workspace_ids: list[UUID],
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        workspace_id: UUID | None = None,
    ) -> tuple[list[Project], int]:
        if not workspace_ids:
            return [], 0

        query = select(Project).where(Project.workspace_id.in_(workspace_ids))
        if workspace_id:
            query = query.where(Project.workspace_id == workspace_id)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(Project.name.ilike(pattern), Project.description.ilike(pattern))
            )

        count_result = await self.db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar_one()

        result = await self.db.execute(
            query.options(selectinload(Project.tags), selectinload(Project.owner))
            .order_by(Project.updated_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def count_by_workspaces(self, workspace_ids: list[UUID]) -> int:
        if not workspace_ids:
            return 0
        result = await self.db.execute(
            select(func.count()).select_from(Project).where(Project.workspace_id.in_(workspace_ids))
        )
        return result.scalar_one()
