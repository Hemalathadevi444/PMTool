from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import TaskStatus
from app.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.repositories.task_repository import TaskRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.dashboard import DashboardStats


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.workspace_repo = WorkspaceRepository(db)
        self.project_repo = ProjectRepository(db)
        self.task_repo = TaskRepository(db)

    async def get_stats(
        self, user: User, workspace_id: UUID | None = None
    ) -> DashboardStats:
        workspaces, _ = await self.workspace_repo.list_all(skip=0, limit=10000)
        workspace_ids = [w.id for w in workspaces]

        if workspace_id:
            if workspace_id not in workspace_ids:
                workspace_ids = []
            else:
                workspace_ids = [workspace_id]

        project_ids = await self.task_repo.get_project_ids(workspace_ids)
        total_projects = await self.project_repo.count_by_workspaces(workspace_ids)
        total_tasks = await self.task_repo.count_by_projects(project_ids)
        completed_tasks = await self.task_repo.count_by_status(project_ids, TaskStatus.DONE)
        pending_tasks = total_tasks - completed_tasks

        return DashboardStats(
            total_projects=total_projects,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            pending_tasks=pending_tasks,
        )
