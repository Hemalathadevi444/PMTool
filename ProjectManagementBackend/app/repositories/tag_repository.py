from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag


class TagRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, tag_id: UUID) -> Tag | None:
        result = await self.db.execute(select(Tag).where(Tag.id == tag_id))
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Tag | None:
        result = await self.db.execute(select(Tag).where(Tag.name == name))
        return result.scalar_one_or_none()

    async def create(self, tag: Tag) -> Tag:
        self.db.add(tag)
        await self.db.flush()
        await self.db.refresh(tag)
        return tag

    async def update(self, tag: Tag) -> Tag:
        await self.db.flush()
        await self.db.refresh(tag)
        return tag

    async def delete(self, tag: Tag) -> None:
        await self.db.delete(tag)
        await self.db.flush()

    async def list_all(self, skip: int = 0, limit: int = 100) -> tuple[list[Tag], int]:
        count_result = await self.db.execute(select(func.count()).select_from(Tag))
        total = count_result.scalar_one()

        result = await self.db.execute(
            select(Tag).order_by(Tag.name.asc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total
