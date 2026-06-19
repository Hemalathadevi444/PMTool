from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.task import TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.task import (
    CommentCreate,
    SubTaskCreate,
    TaskAssignRequest,
    TaskCreate,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.services.task_service import TaskService
from app.utils.dependencies import get_current_active_user
from app.utils.response import paginated_response, success_response

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", summary="Create a task")
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    task = await service.create_task(data, current_user)
    return success_response(data=task.model_dump(mode="json"), message="Task created")


@router.get("", summary="List tasks with search, filters, and pagination")
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="Search by title or description"),
    project_id: UUID | None = Query(None),
    status: TaskStatus | None = Query(None),
    priority: TaskPriority | None = Query(None),
    assignee_id: UUID | None = Query(None, description="Filter tasks assigned to user"),
    root_only: bool = Query(True, description="Return only top-level tasks"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    tasks, total = await service.list_tasks(
        current_user,
        page,
        page_size,
        search=q,
        project_id=project_id,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        root_only=root_only,
    )
    return paginated_response(
        items=[t.model_dump(mode="json") for t in tasks],
        total=total,
        page=page,
        page_size=page_size,
        message="Tasks retrieved",
    )


@router.get("/{task_id}/subtasks", summary="List subtasks for a task")
async def list_subtasks(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    subtasks = await service.list_subtasks(task_id, current_user)
    return success_response(
        data=[t.model_dump(mode="json") for t in subtasks],
        message="Subtasks retrieved",
    )


@router.post("/{task_id}/subtasks", summary="Create a subtask")
async def create_subtask(
    task_id: UUID,
    data: SubTaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    subtask = await service.create_subtask(task_id, data, current_user)
    return success_response(data=subtask.model_dump(mode="json"), message="Subtask created")


@router.get("/{task_id}", summary="Get task by ID")
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    task = await service.get_task(task_id, current_user)
    return success_response(data=task.model_dump(mode="json"), message="Task retrieved")


@router.patch("/{task_id}", summary="Update task")
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    task = await service.update_task(task_id, data, current_user)
    return success_response(data=task.model_dump(mode="json"), message="Task updated")


@router.patch("/{task_id}/status", summary="Update task status")
async def update_task_status(
    task_id: UUID,
    data: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    task = await service.update_task_status(task_id, data, current_user)
    return success_response(data=task.model_dump(mode="json"), message="Task status updated")


@router.post("/{task_id}/assign", summary="Assign users to task")
async def assign_task(
    task_id: UUID,
    data: TaskAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    task = await service.assign_task(task_id, data, current_user)
    return success_response(data=task.model_dump(mode="json"), message="Users assigned to task")


@router.put("/{task_id}/assignees", summary="Replace all task assignees")
async def replace_assignees(
    task_id: UUID,
    data: TaskAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    task = await service.replace_assignees(task_id, data, current_user)
    return success_response(data=task.model_dump(mode="json"), message="Task assignees updated")


@router.delete("/{task_id}", summary="Delete task")
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    await service.delete_task(task_id, current_user)
    return success_response(data=None, message="Task deleted")


@router.post("/{task_id}/comments", summary="Add comment to task")
async def add_task_comment(
    task_id: UUID,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    comment = await service.add_comment(task_id, data, current_user)
    return success_response(data=comment.model_dump(mode="json"), message="Comment added")


@router.get("/{task_id}/comments", summary="List task comments")
async def list_task_comments(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TaskService(db)
    comments = await service.list_comments(task_id, current_user)
    return success_response(
        data=[c.model_dump(mode="json") for c in comments],
        message="Comments retrieved",
    )
