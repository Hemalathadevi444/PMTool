from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import TaskPriority, TaskStatus
from app.schemas.tag import TagResponse
from app.schemas.user import UserResponse


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    project_id: UUID
    parent_task_id: UUID | None = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: date | None = None
    assignee_ids: list[UUID] = Field(default_factory=list)
    tag_ids: list[UUID] = Field(default_factory=list)


class SubTaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: date | None = None
    assignee_ids: list[UUID] = Field(default_factory=list)
    tag_ids: list[UUID] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: date | None = None
    tag_ids: list[UUID] | None = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskAssignRequest(BaseModel):
    user_ids: list[UUID] = Field(default_factory=list)


class AssigneeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    assigned_at: datetime
    user: UserResponse | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    due_date: date | None
    project_id: UUID
    parent_task_id: UUID | None = None
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = Field(default_factory=list)
    assignees: list[AssigneeResponse] = Field(default_factory=list)
    subtask_count: int = 0
    comments_count: int = 0


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: str
    project_id: UUID | None = None
    task_id: UUID | None = None
    author_id: UUID
    created_at: datetime
    updated_at: datetime
    author: UserResponse | None = None


class TaskSearchParams(BaseModel):
    q: str | None = Field(default=None, description="Search by title or description")
    project_id: UUID | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
