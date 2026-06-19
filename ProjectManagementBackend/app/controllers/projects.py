from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.project_service import ProjectService
from app.utils.dependencies import get_current_active_user
from app.utils.response import paginated_response, success_response

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", summary="Create a project")
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ProjectService(db)
    project = await service.create_project(data, current_user)
    return success_response(data=project.model_dump(), message="Project created")


@router.get("", summary="List projects with search and pagination")
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="Search by name or description"),
    workspace_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ProjectService(db)
    projects, total = await service.list_projects(
        current_user, page, page_size, search=q, workspace_id=workspace_id
    )
    return paginated_response(
        items=[p.model_dump() for p in projects],
        total=total,
        page=page,
        page_size=page_size,
        message="Projects retrieved",
    )


@router.get("/{project_id}", summary="Get project by ID")
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ProjectService(db)
    project = await service.get_project(project_id, current_user)
    return success_response(data=project.model_dump(), message="Project retrieved")


@router.patch("/{project_id}", summary="Update project")
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ProjectService(db)
    project = await service.update_project(project_id, data, current_user)
    return success_response(data=project.model_dump(), message="Project updated")


@router.delete("/{project_id}", summary="Delete project")
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ProjectService(db)
    await service.delete_project(project_id, current_user)
    return success_response(data=None, message="Project deleted")


from app.schemas.task import CommentCreate

@router.post("/{project_id}/comments", summary="Add comment to project")
async def add_project_comment(
    project_id: UUID,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ProjectService(db)
    comment = await service.add_comment(project_id, data, current_user)
    return success_response(data=comment.model_dump(mode="json"), message="Comment added")


@router.get("/{project_id}/comments", summary="List project comments")
async def list_project_comments(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ProjectService(db)
    comments = await service.list_comments(project_id, current_user)
    return success_response(
        data=[c.model_dump(mode="json") for c in comments],
        message="Comments retrieved",
    )
