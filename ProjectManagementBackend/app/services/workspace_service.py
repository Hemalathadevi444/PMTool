from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.workspace import Workspace, WorkspaceRole
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate
from app.utils.exceptions import AppException


class WorkspaceService:
    def __init__(self, db: AsyncSession):
        self.workspace_repo = WorkspaceRepository(db)

    async def _ensure_exists(self, workspace_id: UUID) -> Workspace:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise AppException(status_code=404, message="Workspace not found")
        return workspace

    async def _ensure_access(self, workspace_id: UUID, user_id: UUID) -> Workspace:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise AppException(status_code=404, message="Workspace not found")
        if workspace.owner_id != user_id:
            is_member = await self.workspace_repo.is_member(workspace_id, user_id)
            if not is_member:
                raise AppException(status_code=403, message="Access denied to workspace")
        return workspace

    async def create_workspace(self, data: WorkspaceCreate, user: User) -> WorkspaceResponse:
        existing = await self.workspace_repo.get_by_name(data.name)
        if existing:
            raise AppException(status_code=400, message="A workspace with this name already exists")
        workspace = Workspace(
            name=data.name,
            description=data.description,
            owner_id=user.id,
        )
        workspace = await self.workspace_repo.create(workspace)
        await self.workspace_repo.create_member(
            workspace.id, user.id, role=WorkspaceRole.OWNER
        )
        return WorkspaceResponse.model_validate(workspace)

    async def update_workspace(
        self, workspace_id: UUID, data: WorkspaceUpdate, user: User
    ) -> WorkspaceResponse:
        workspace = await self._ensure_exists(workspace_id)
        updates = data.model_dump(exclude_unset=True)

        if "name" in updates and data.name is not None:
            existing = await self.workspace_repo.get_by_name(data.name)
            if existing and existing.id != workspace_id:
                raise AppException(status_code=400, message="A workspace with this name already exists")
            workspace.name = data.name
        if "description" in updates:
            workspace.description = data.description

        workspace = await self.workspace_repo.update(workspace)
        return WorkspaceResponse.model_validate(workspace)

    async def list_workspaces(
        self, user: User, page: int, page_size: int
    ) -> tuple[list[WorkspaceResponse], int]:
        skip = (page - 1) * page_size
        workspaces, total = await self.workspace_repo.list_all(
            skip=skip, limit=page_size
        )
        return [WorkspaceResponse.model_validate(w) for w in workspaces], total

    async def get_workspace(self, workspace_id: UUID, user: User) -> WorkspaceResponse:
        workspace = await self._ensure_exists(workspace_id)
        return WorkspaceResponse.model_validate(workspace)
