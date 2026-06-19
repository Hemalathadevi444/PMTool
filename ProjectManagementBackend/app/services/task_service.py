from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.repositories.comment_repository import CommentRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.task_repository import TaskRepository
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.services.tag_service import TagService
from app.schemas.task import (
    CommentCreate,
    CommentResponse,
    SubTaskCreate,
    TaskAssignRequest,
    TaskCreate,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.utils.exceptions import AppException
from app.utils.email import send_email


class TaskService:
    def __init__(self, db: AsyncSession):
        self.task_repo = TaskRepository(db)
        self.project_repo = ProjectRepository(db)
        self.workspace_repo = WorkspaceRepository(db)
        self.user_repo = UserRepository(db)
        self.comment_repo = CommentRepository(db)
        self.tag_service = TagService(db)

    async def _get_accessible_project_ids(self, user: User) -> list[UUID]:
        workspace_ids = await self._get_all_workspace_ids()
        return await self.task_repo.get_project_ids(workspace_ids)

    async def _get_all_workspace_ids(self) -> list[UUID]:
        workspaces, _ = await self.workspace_repo.list_all(skip=0, limit=10000)
        return [w.id for w in workspaces]

    async def _ensure_project_exists(self, project_id: UUID) -> None:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise AppException(status_code=404, message="Project not found")

    async def _ensure_project_access(self, project_id: UUID, user: User) -> None:
        await self._ensure_project_exists(project_id)

    async def _to_response(self, task: Task) -> TaskResponse:
        subtask_count = await self.task_repo.count_subtasks(task.id)
        data = TaskResponse.model_validate(task)
        return data.model_copy(update={"subtask_count": subtask_count})

    async def create_task(self, data: TaskCreate, user: User) -> TaskResponse:
        await self._ensure_project_access(data.project_id, user)
        
        # Enforce that task due date does not exceed the project due date
        if data.due_date:
            project = await self.project_repo.get_by_id(data.project_id)
            if project and project.due_date:
                proj_date = project.due_date.date() if hasattr(project.due_date, "date") else project.due_date
                task_date = data.due_date.date() if hasattr(data.due_date, "date") else data.due_date
                if task_date > proj_date:
                    raise AppException(
                        status_code=400,
                        message=f"Task due date ({task_date}) cannot exceed project due date ({proj_date})"
                    )

        parent_task_id = data.parent_task_id
        if parent_task_id:
            parent = await self.task_repo.get_by_id(parent_task_id)
            if not parent:
                raise AppException(status_code=404, message="Parent task not found")
            if parent.project_id != data.project_id:
                raise AppException(status_code=400, message="Subtask must belong to same project as parent")

            # Check hierarchy depth
            depth = 0
            curr = parent
            while curr.parent_task_id:
                depth += 1
                curr_parent = await self.task_repo.get_by_id(curr.parent_task_id)
                if not curr_parent:
                    break
                curr = curr_parent

            if depth >= 2:
                raise AppException(status_code=400, message="Maximum subtask depth exceeded")

            if depth == 1:
                # Parent is a first-level subtask. Check if it already has any nested subtask.
                existing_count = await self.task_repo.count_subtasks(parent.id)
                if existing_count >= 1:
                    raise AppException(
                        status_code=400,
                        message="A sub task can only have one nested sub task"
                    )
        tags = await self.tag_service.validate_tags_exist(data.tag_ids)
        task = Task(
            title=data.title,
            description=data.description,
            project_id=data.project_id,
            parent_task_id=parent_task_id,
            status=data.status,
            priority=data.priority,
            due_date=data.due_date,
            tags=tags,
            created_by_id=user.id,
        )
        task = await self.task_repo.create(task)
        if data.assignee_ids:
            await self._validate_assignees(data.assignee_ids)
            await self.task_repo.add_assignees(task.id, data.assignee_ids)
            task = await self.task_repo.get_by_id(task.id)
            await self._send_assignment_emails(user, data.assignee_ids)
        return await self._to_response(task)  # type: ignore[arg-type]

    async def create_subtask(
        self, parent_task_id: UUID, data: SubTaskCreate, user: User
    ) -> TaskResponse:
        parent = await self._get_task_with_access(parent_task_id, user)
        create_data = TaskCreate(
            title=data.title,
            description=data.description,
            project_id=parent.project_id,
            parent_task_id=parent_task_id,
            status=data.status,
            priority=data.priority,
            due_date=data.due_date,
            assignee_ids=data.assignee_ids,
        )
        return await self.create_task(create_data, user)

    async def list_subtasks(self, task_id: UUID, user: User) -> list[TaskResponse]:
        await self._get_task_with_access(task_id, user)
        subtasks = await self.task_repo.list_subtasks(task_id)
        return [await self._to_response(t) for t in subtasks]

    async def _check_subtasks_completed(self, task_id: UUID) -> None:
        subtasks = await self.task_repo.list_subtasks(task_id)
        for sub in subtasks:
            if sub.status != TaskStatus.DONE:
                raise AppException(
                    status_code=400,
                    message="Cannot complete task because one or more subtasks are not completed"
                )
            await self._check_subtasks_completed(sub.id)

    async def update_task(self, task_id: UUID, data: TaskUpdate, user: User) -> TaskResponse:
        task = await self._get_task_with_access(task_id, user)
        if data.title is not None:
            task.title = data.title
        if data.description is not None:
            task.description = data.description
        if data.status is not None:
            if data.status == TaskStatus.DONE:
                await self._check_subtasks_completed(task_id)
            task.status = data.status
        if data.priority is not None:
            task.priority = data.priority
        if data.due_date is not None:
            project = await self.project_repo.get_by_id(task.project_id)
            if project and project.due_date:
                proj_date = project.due_date.date() if hasattr(project.due_date, "date") else project.due_date
                task_date = data.due_date.date() if hasattr(data.due_date, "date") else data.due_date
                if task_date > proj_date:
                    raise AppException(
                        status_code=400,
                        message=f"Task due date ({task_date}) cannot exceed project due date ({proj_date})"
                    )
            task.due_date = data.due_date
        updates = data.model_dump(exclude_unset=True)
        if "tag_ids" in updates:
            tags = await self.tag_service.validate_tags_exist(updates["tag_ids"])
            task.tags = tags
        task = await self.task_repo.update(task)
        return await self._to_response(task)

    async def update_task_status(
        self, task_id: UUID, data: TaskStatusUpdate, user: User
    ) -> TaskResponse:
        task = await self._get_task_with_access(task_id, user)
        if data.status == TaskStatus.DONE:
            await self._check_subtasks_completed(task_id)
        task.status = data.status
        task = await self.task_repo.update(task)
        return await self._to_response(task)

    async def assign_task(
        self, task_id: UUID, data: TaskAssignRequest, user: User
    ) -> TaskResponse:
        task = await self._get_task_with_access(task_id, user)
        await self._validate_assignees(data.user_ids)
        await self.task_repo.add_assignees(task.id, data.user_ids)
        task = await self.task_repo.get_by_id(task.id)
        await self._send_assignment_emails(user, data.user_ids)
        return await self._to_response(task)  # type: ignore[arg-type]

    async def replace_assignees(
        self, task_id: UUID, data: TaskAssignRequest, user: User
    ) -> TaskResponse:
        task = await self._get_task_with_access(task_id, user)
        await self._validate_assignees(data.user_ids)
        await self.task_repo.set_assignees(task.id, data.user_ids)
        task = await self.task_repo.get_by_id(task.id)
        await self._send_assignment_emails(user, data.user_ids)
        return await self._to_response(task)  # type: ignore[arg-type]

    async def delete_task(self, task_id: UUID, user: User) -> None:
        task = await self._get_task_with_access(task_id, user)
        await self.task_repo.delete(task)

    async def list_tasks(
        self,
        user: User,
        page: int,
        page_size: int,
        search: str | None = None,
        project_id: UUID | None = None,
        status=None,
        priority=None,
        assignee_id: UUID | None = None,
        root_only: bool = True,
    ) -> tuple[list[TaskResponse], int]:
        project_ids = await self._get_accessible_project_ids(user)
        if project_id:
            project = await self.project_repo.get_by_id(project_id)
            if not project:
                raise AppException(status_code=404, message="Project not found")
            project_ids = [project_id]

        skip = (page - 1) * page_size
        tasks, total = await self.task_repo.list_by_projects(
            project_ids,
            skip=skip,
            limit=page_size,
            search=search,
            project_id=project_id,
            status=status,
            priority=priority,
            root_only=root_only,
            assignee_id=assignee_id,
        )
        responses = [await self._to_response(t) for t in tasks]
        return responses, total

    async def get_task(self, task_id: UUID, user: User) -> TaskResponse:
        task = await self._get_task_with_access(task_id, user)
        return await self._to_response(task)



    async def _get_task_with_access(self, task_id: UUID, user: User) -> Task:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise AppException(status_code=404, message="Task not found")
        await self._ensure_project_access(task.project_id, user)
        return task

    async def _validate_assignees(self, user_ids: list[UUID]) -> None:
        for user_id in user_ids:
            assignee = await self.user_repo.get_by_id(user_id)
            if not assignee or not assignee.is_active:
                raise AppException(status_code=400, message=f"Invalid assignee: {user_id}")

    async def _send_assignment_emails(self, assigner: User, user_ids: list[UUID]) -> None:
        for user_id in user_ids:
            assignee = await self.user_repo.get_by_id(user_id)
            if assignee:
                send_email(
                    to_email=assignee.email,
                    subject=f"{assigner.full_name} assigned a task to you",
                    body=f"{assigner.full_name} assigned a task to you",
                )

    async def add_comment(
        self, task_id: UUID, data: CommentCreate, user: User
    ) -> CommentResponse:
        task = await self._get_task_with_access(task_id, user)
        comment = Comment(
            content=data.content,
            task_id=task_id,
            project_id=task.project_id,
            author_id=user.id,
        )
        comment = await self.comment_repo.create(comment)
        return CommentResponse.model_validate(comment)

    async def list_comments(self, task_id: UUID, user: User) -> list[CommentResponse]:
        await self._get_task_with_access(task_id, user)
        comments = await self.comment_repo.list_by_task(task_id)
        return [CommentResponse.model_validate(c) for c in comments]
