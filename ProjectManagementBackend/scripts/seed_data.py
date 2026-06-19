"""
Seed sample data for development and testing.

Usage (from project root):
    python -m scripts.seed_data
"""
import asyncio
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database.session import AsyncSessionLocal
from app.models.comment import Comment
from app.models.project import Project
from app.models.task import Task, TaskAssignee, TaskPriority, TaskStatus
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.utils.security import get_password_hash


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        existing = await db.execute(
            select(User).where(User.email == "admin@example.com")
        )
        if existing.scalar_one_or_none():
            print("Seed data already exists. Skipping.")
            return

        admin = User(
            email="admin@example.com",
            full_name="Admin User",
            hashed_password=get_password_hash("Admin@12345"),
        )
        member = User(
            email="member@example.com",
            full_name="Team Member",
            hashed_password=get_password_hash("Member@12345"),
        )
        db.add_all([admin, member])
        await db.flush()

        workspace = Workspace(
            name="Acme Corp",
            description="Main workspace for Acme projects",
            owner_id=admin.id,
        )
        db.add(workspace)
        await db.flush()

        db.add_all(
            [
                WorkspaceMember(workspace_id=workspace.id, user_id=admin.id, role=WorkspaceRole.OWNER),
                WorkspaceMember(workspace_id=workspace.id, user_id=member.id, role=WorkspaceRole.MEMBER),
            ]
        )

        project = Project(
            name="Website Redesign",
            description="Q2 website overhaul",
            workspace_id=workspace.id,
            created_by_id=admin.id,
        )
        db.add(project)
        await db.flush()

        tasks = [
            Task(
                title="Design homepage mockup",
                description="Create Figma mockups for the new homepage",
                status=TaskStatus.DONE,
                priority=TaskPriority.HIGH,
                due_date=date.today() - timedelta(days=5),
                project_id=project.id,
                created_by_id=admin.id,
            ),
            Task(
                title="Implement navigation",
                description="Build responsive nav component",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.MEDIUM,
                due_date=date.today() + timedelta(days=7),
                project_id=project.id,
                created_by_id=admin.id,
            ),
            Task(
                title="Write API documentation",
                description="Document all REST endpoints",
                status=TaskStatus.TODO,
                priority=TaskPriority.LOW,
                due_date=date.today() + timedelta(days=14),
                project_id=project.id,
                created_by_id=admin.id,
            ),
        ]
        db.add_all(tasks)
        await db.flush()

        db.add(TaskAssignee(task_id=tasks[1].id, user_id=member.id))
        db.add(
            Comment(
                content="Mockups approved by stakeholders.",
                task_id=tasks[0].id,
                author_id=admin.id,
            )
        )
        db.add(
            Comment(
                content="Starting on mobile breakpoints today.",
                task_id=tasks[1].id,
                author_id=member.id,
            )
        )

        await db.commit()
        print("Seed data created successfully.")
        print("  Admin:  admin@example.com / Admin@12345")
        print("  Member: member@example.com / Member@12345")


if __name__ == "__main__":
    asyncio.run(seed())
