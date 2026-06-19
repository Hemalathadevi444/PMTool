from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.comment import Comment


class CommentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, comment: Comment) -> Comment:
        self.db.add(comment)
        await self.db.flush()
        return await self.get_by_id(comment.id)  # type: ignore[return-value]

    async def get_by_id(self, comment_id: UUID) -> Comment | None:
        result = await self.db.execute(
            select(Comment)
            .options(selectinload(Comment.author))
            .where(Comment.id == comment_id)
        )
        return result.scalar_one_or_none()

    async def list_by_project(self, project_id: UUID) -> list[Comment]:
        result = await self.db.execute(
            select(Comment)
            .options(selectinload(Comment.author))
            .where(Comment.project_id == project_id)
            .where(Comment.task_id == None)
            .order_by(Comment.created_at.asc())
        )
        return list(result.scalars().all())

    async def count_by_project(self, project_id: UUID) -> int:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count())
            .select_from(Comment)
            .where(Comment.project_id == project_id)
            .where(Comment.task_id == None)
        )
        return result.scalar_one()

    async def list_by_task(self, task_id: UUID) -> list[Comment]:
        result = await self.db.execute(
            select(Comment)
            .options(selectinload(Comment.author))
            .where(Comment.task_id == task_id)
            .order_by(Comment.created_at.asc())
        )
        return list(result.scalars().all())

    async def count_by_task(self, task_id: UUID) -> int:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count()).select_from(Comment).where(Comment.task_id == task_id)
        )
        return result.scalar_one()
