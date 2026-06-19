from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.comment import Comment
from app.models.user import User
from app.models.tag import Tag
from app.repositories.project_repository import ProjectRepository
from app.repositories.tag_repository import TagRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.comment_repository import CommentRepository
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.schemas.task import CommentCreate, CommentResponse
from app.utils.exceptions import AppException


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.project_repo = ProjectRepository(db)
        self.workspace_repo = WorkspaceRepository(db)
        self.tag_repo = TagRepository(db)
        self.comment_repo = CommentRepository(db)

    async def _get_all_workspace_ids(self) -> list[UUID]:
        workspaces, _ = await self.workspace_repo.list_all(skip=0, limit=10000)
        return [w.id for w in workspaces]

    async def _ensure_workspace_exists(self, workspace_id: UUID) -> None:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if not workspace:
            raise AppException(status_code=404, message="Workspace not found")

    async def _ensure_workspace_access(self, workspace_id: UUID, user: User) -> None:
        await self._ensure_workspace_exists(workspace_id)

    async def _validate_tags(self, tag_ids: list[UUID] | None) -> list[Tag]:
        if not tag_ids:
            return []
        tags = []
        for tag_id in tag_ids:
            tag = await self.tag_repo.get_by_id(tag_id)
            if not tag:
                raise AppException(status_code=404, message=f"Tag not found: {tag_id}")
            tags.append(tag)
        return tags

    async def create_project(self, data: ProjectCreate, user: User) -> ProjectResponse:
        await self._ensure_workspace_access(data.workspace_id, user)
        tags = await self._validate_tags(data.tag_ids)
        project = Project(
            name=data.name,
            description=data.description,
            workspace_id=data.workspace_id,
            created_by_id=user.id,
            status=data.status,
            priority=data.priority,
            issue_type=data.issue_type,
            category=data.category,
            owner_id=data.owner_id,
            due_date=data.due_date,
            tags=tags,
        )
        project = await self.project_repo.create(project)
        return ProjectResponse.model_validate(project)

    async def update_project(
        self, project_id: UUID, data: ProjectUpdate, user: User
    ) -> ProjectResponse:
        project = await self._get_project_with_access(project_id, user)
        updates = data.model_dump(exclude_unset=True)
        if "name" in updates and data.name is not None:
            project.name = data.name
        if "description" in updates:
            project.description = data.description
        if "status" in updates and data.status is not None:
            project.status = data.status
        if "issue_type" in updates and data.issue_type is not None:
            project.issue_type = data.issue_type
        if "category" in updates and data.category is not None:
            project.category = data.category
        if "priority" in updates and data.priority is not None:
            project.priority = data.priority
        if "owner_id" in updates and data.owner_id is not None:
            project.owner_id = data.owner_id
        if "due_date" in updates:
            project.due_date = data.due_date
        if "tag_ids" in updates and data.tag_ids is not None:
            tags = await self._validate_tags(data.tag_ids)
            project.tags = tags
        project = await self.project_repo.update(project)
        return ProjectResponse.model_validate(project)

    async def delete_project(self, project_id: UUID, user: User) -> None:
        project = await self._get_project_with_access(project_id, user)
        await self.project_repo.delete(project)

    async def list_projects(
        self,
        user: User,
        page: int,
        page_size: int,
        search: str | None = None,
        workspace_id: UUID | None = None,
    ) -> tuple[list[ProjectResponse], int]:
        workspace_ids = await self._get_all_workspace_ids()
        if workspace_id:
            if workspace_id not in workspace_ids:
                raise AppException(status_code=404, message="Workspace not found")
            workspace_ids = [workspace_id]

        skip = (page - 1) * page_size
        projects, total = await self.project_repo.list_all_for_user_workspaces(
            workspace_ids,
            skip=skip,
            limit=page_size,
            search=search,
            workspace_id=workspace_id,
        )
        return [ProjectResponse.model_validate(p) for p in projects], total

    async def get_project(self, project_id: UUID, user: User) -> ProjectResponse:
        project = await self._get_project_with_access(project_id, user)
        return ProjectResponse.model_validate(project)

    async def _get_project_with_access(self, project_id: UUID, user: User) -> Project:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise AppException(status_code=404, message="Project not found")
        await self._ensure_workspace_access(project.workspace_id, user)
        return project

    async def add_comment(
        self, project_id: UUID, data: CommentCreate, user: User
    ) -> CommentResponse:
        await self._get_project_with_access(project_id, user)
        comment = Comment(content=data.content, project_id=project_id, author_id=user.id)
        comment = await self.comment_repo.create(comment)
        return CommentResponse.model_validate(comment)

    async def list_comments(self, project_id: UUID, user: User) -> list[CommentResponse]:
        await self._get_project_with_access(project_id, user)
        comments = await self.comment_repo.list_by_project(project_id)
        return [CommentResponse.model_validate(c) for c in comments]
