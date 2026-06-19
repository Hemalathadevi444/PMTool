from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.task import Task, TaskAssignee, TaskPriority, TaskStatus


class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _base_query(self):
        return select(Task).options(
            selectinload(Task.assignees).selectinload(TaskAssignee.user),
            selectinload(Task.tags),
        )

    async def get_by_id(self, task_id: UUID) -> Task | None:
        result = await self.db.execute(self._base_query().where(Task.id == task_id))
        return result.scalar_one_or_none()

    async def create(self, task: Task) -> Task:
        self.db.add(task)
        await self.db.flush()
        return await self.get_by_id(task.id)  # type: ignore[return-value]

    async def update(self, task: Task) -> Task:
        await self.db.flush()
        return await self.get_by_id(task.id)  # type: ignore[return-value]

    async def delete(self, task: Task) -> None:
        await self.db.delete(task)
        await self.db.flush()

    def _count_query(self, *where_clauses):
        return select(func.count()).select_from(Task).where(*where_clauses)

    async def list_by_project(
        self,
        project_id: UUID,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        root_only: bool = True,
        assignee_id: UUID | None = None,
    ) -> tuple[list[Task], int]:
        filters = [Task.project_id == project_id]
        if root_only:
            filters.append(Task.parent_task_id.is_(None))
        filters.extend(self._filter_clauses(search, status, priority))
        if assignee_id:
            filters.append(
                Task.id.in_(
                    select(TaskAssignee.task_id).where(TaskAssignee.user_id == assignee_id)
                )
            )

        count_result = await self.db.execute(self._count_query(*filters))
        total = count_result.scalar_one()

        query = self._base_query().where(*filters)

        result = await self.db.execute(
            query.order_by(Task.updated_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().unique().all()), total

    async def list_subtasks(self, parent_task_id: UUID) -> list[Task]:
        result = await self.db.execute(
            self._base_query()
            .where(Task.parent_task_id == parent_task_id)
            .order_by(Task.updated_at.desc())
        )
        return list(result.scalars().unique().all())

    async def count_subtasks(self, parent_task_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Task).where(Task.parent_task_id == parent_task_id)
        )
        return result.scalar_one()

    async def list_by_projects(
        self,
        project_ids: list[UUID],
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        project_id: UUID | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        root_only: bool = True,
        assignee_id: UUID | None = None,
    ) -> tuple[list[Task], int]:
        if not project_ids:
            return [], 0

        filters = [Task.project_id.in_(project_ids)]
        if project_id:
            filters.append(Task.project_id == project_id)
        if root_only:
            filters.append(Task.parent_task_id.is_(None))
        filters.extend(self._filter_clauses(search, status, priority))
        if assignee_id:
            filters.append(
                Task.id.in_(
                    select(TaskAssignee.task_id).where(TaskAssignee.user_id == assignee_id)
                )
            )

        count_result = await self.db.execute(self._count_query(*filters))
        total = count_result.scalar_one()

        query = self._base_query().where(*filters)
        result = await self.db.execute(
            query.order_by(Task.updated_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().unique().all()), total

    def _filter_clauses(self, search, status, priority):
        clauses = []
        if search:
            pattern = f"%{search}%"
            clauses.append(
                or_(Task.title.ilike(pattern), Task.description.ilike(pattern))
            )
        if status:
            clauses.append(Task.status == status)
        if priority:
            clauses.append(Task.priority == priority)
        return clauses

    async def set_assignees(self, task_id: UUID, user_ids: list[UUID]) -> None:
        existing = await self.db.execute(
            select(TaskAssignee).where(TaskAssignee.task_id == task_id)
        )
        for assignee in existing.scalars().all():
            await self.db.delete(assignee)
        await self.db.flush()

        for user_id in user_ids:
            self.db.add(TaskAssignee(task_id=task_id, user_id=user_id))
        await self.db.flush()

    async def add_assignees(self, task_id: UUID, user_ids: list[UUID]) -> None:
        for user_id in user_ids:
            exists = await self.db.execute(
                select(TaskAssignee).where(
                    TaskAssignee.task_id == task_id,
                    TaskAssignee.user_id == user_id,
                )
            )
            if exists.scalar_one_or_none() is None:
                self.db.add(TaskAssignee(task_id=task_id, user_id=user_id))
        await self.db.flush()

    async def count_by_projects(self, project_ids: list[UUID]) -> int:
        if not project_ids:
            return 0
        result = await self.db.execute(
            select(func.count()).select_from(Task).where(Task.project_id.in_(project_ids))
        )
        return result.scalar_one()

    async def count_by_status(self, project_ids: list[UUID], status: TaskStatus) -> int:
        if not project_ids:
            return 0
        result = await self.db.execute(
            select(func.count())
            .select_from(Task)
            .where(Task.project_id.in_(project_ids), Task.status == status)
        )
        return result.scalar_one()

    async def get_project_ids(self, workspace_ids: list[UUID]) -> list[UUID]:
        from app.models.project import Project

        if not workspace_ids:
            return []
        result = await self.db.execute(
            select(Project.id).where(Project.workspace_id.in_(workspace_ids))
        )
        return list(result.scalars().all())
