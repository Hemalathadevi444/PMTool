import asyncio
from uuid import uuid4
from sqlalchemy import select, delete

from app.database.session import AsyncSessionLocal
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.project import Project
from app.models.task import Task, TaskAssignee
from app.schemas.task import TaskCreate
from app.services.task_service import TaskService
from app.utils.exceptions import AppException

TEST_EMAIL = "mytasks_test@aighospitals.com"
TEST_NAME = "MyTasks Tester"
TEST_PASSWORD = "Password@123"

async def get_or_create_test_user(session) -> User:
    result = await session.execute(
        select(User).where(User.email == TEST_EMAIL)
    )
    user = result.scalar_one_or_none()
    if not user:
        from app.utils.security import get_password_hash
        user = User(
            email=TEST_EMAIL,
            full_name=TEST_NAME,
            hashed_password=get_password_hash(TEST_PASSWORD),
            is_active=True,
        )
        session.add(user)
        await session.flush()
    return user

async def cleanup_test_data():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == TEST_EMAIL)
        )
        user = result.scalar_one_or_none()
        if user:
            # Delete workspaces owned by this user
            result = await session.execute(
                select(Workspace).where(Workspace.owner_id == user.id)
            )
            workspaces = result.scalars().all()
            for ws in workspaces:
                # Delete projects
                proj_result = await session.execute(
                    select(Project).where(Project.workspace_id == ws.id)
                )
                projects = proj_result.scalars().all()
                for p in projects:
                    await session.execute(delete(TaskAssignee).where(TaskAssignee.task_id.in_(
                        select(Task.id).where(Task.project_id == p.id)
                    )))
                    await session.execute(delete(Task).where(Task.project_id == p.id))
                    await session.execute(delete(Project).where(Project.id == p.id))
                
                await session.execute(delete(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id))
                await session.execute(delete(Workspace).where(Workspace.id == ws.id))
            
            await session.execute(delete(User).where(User.id == user.id))
            await session.commit()
            print("Cleaned up My Tasks test data.")

async def run_tests():
    print("\n--- Starting My Tasks Verification Tests ---")
    await cleanup_test_data()
    
    async with AsyncSessionLocal() as session:
        user = await get_or_create_test_user(session)
        
        # Create workspace and project
        from app.services.workspace_service import WorkspaceService
        ws_service = WorkspaceService(session)
        from app.schemas.workspace import WorkspaceCreate
        ws = await ws_service.create_workspace(WorkspaceCreate(name="MyTasks WS"), user)
        
        from app.services.project_service import ProjectService
        proj_service = ProjectService(session)
        from app.schemas.project import ProjectCreate
        proj = await proj_service.create_project(
            ProjectCreate(
                name="MyTasks Proj",
                workspace_id=ws.id,
                issue_type="Bug",
                category="HIS",
                priority="medium",
                owner_id=user.id,
                due_date="2026-12-31"
            ),
            user
        )
        
        task_service = TaskService(session)
        
        # 1. Create a parent task assigned to user
        print("\n[Step 1] Creating parent task assigned to user...")
        t1 = await task_service.create_task(
            TaskCreate(
                title="Parent Task Assigned",
                project_id=proj.id,
                assignee_ids=[user.id]
            ),
            user
        )
        
        # 2. Create a parent task NOT assigned to user
        print("\n[Step 2] Creating parent task NOT assigned to user...")
        t2 = await task_service.create_task(
            TaskCreate(
                title="Parent Task Unassigned",
                project_id=proj.id,
                assignee_ids=[]
            ),
            user
        )
        
        # 3. Create a subtask under t2 assigned to user
        print("\n[Step 3] Creating subtask assigned to user under unassigned parent...")
        from app.schemas.task import SubTaskCreate
        sub = await task_service.create_subtask(
            t2.id,
            SubTaskCreate(
                title="Subtask Assigned",
                status="todo",
                priority="medium",
                assignee_ids=[user.id]
            ),
            user
        )
        
        await session.commit()
        
        # 4. Query list_tasks filtering by assignee_id and root_only=False
        print("\n[Step 4] Querying tasks with assignee_id and root_only=False...")
        tasks, total = await task_service.list_tasks(
            user=user,
            page=1,
            page_size=20,
            assignee_id=user.id,
            root_only=False
        )
        
        print(f"Total tasks retrieved: {total}")
        for t in tasks:
            print(f" - [{t.id}] {t.title} (Parent: {t.parent_task_id})")
            
        task_ids = [t.id for t in tasks]
        assert t1.id in task_ids, "Parent task assigned should be retrieved"
        assert sub.id in task_ids, "Subtask assigned should be retrieved"
        assert t2.id not in task_ids, "Parent task unassigned should NOT be retrieved"
        print("Success: list_tasks with root_only=False correctly retrieves both root tasks and subtasks assigned to the user.")
        
    await cleanup_test_data()
    print("\n=== My Tasks Verification Tests Passed Successfully! ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
