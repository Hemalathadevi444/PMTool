from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import TaskStatus
from app.schemas.tag import TagResponse


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str
    email: str


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    workspace_id: UUID
    tag_ids: list[UUID] = Field(default_factory=list)
    status: TaskStatus = TaskStatus.TODO
    issue_type: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=100)
    priority: str = Field(min_length=1, max_length=100)
    owner_id: UUID
    due_date: datetime


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    tag_ids: list[UUID] | None = None
    status: TaskStatus | None = None
    issue_type: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    priority: str | None = Field(default=None, min_length=1, max_length=100)
    owner_id: UUID | None = None
    due_date: datetime | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    status: TaskStatus
    workspace_id: UUID
    created_by_id: UUID | None
    issue_type: str | None
    category: str | None
    priority: str | None
    owner_id: UUID | None
    owner: UserBrief | None = None
    due_date: datetime | None
    tags: list[TagResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ProjectSearchParams(BaseModel):
    q: str | None = Field(default=None, description="Search by name or description")
    workspace_id: UUID | None = None
