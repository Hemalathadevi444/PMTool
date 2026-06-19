from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.services.workspace_service import WorkspaceService
from app.utils.dependencies import get_current_active_user
from app.utils.response import paginated_response, success_response

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.post("", summary="Create a workspace")
async def create_workspace(
    data: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = WorkspaceService(db)
    workspace = await service.create_workspace(data, current_user)
    return success_response(data=workspace.model_dump(), message="Workspace created")


@router.get("", summary="List workspaces for current user")
async def list_workspaces(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = WorkspaceService(db)
    workspaces, total = await service.list_workspaces(current_user, page, page_size)
    return paginated_response(
        items=[w.model_dump() for w in workspaces],
        total=total,
        page=page,
        page_size=page_size,
        message="Workspaces retrieved",
    )


@router.get("/{workspace_id}", summary="Get workspace by ID")
async def get_workspace(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = WorkspaceService(db)
    workspace = await service.get_workspace(workspace_id, current_user)
    return success_response(data=workspace.model_dump(), message="Workspace retrieved")


@router.patch("/{workspace_id}", summary="Update workspace")
async def update_workspace(
    workspace_id: UUID,
    data: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = WorkspaceService(db)
    workspace = await service.update_workspace(workspace_id, data, current_user)
    return success_response(data=workspace.model_dump(), message="Workspace updated")
