from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag
from app.models.user import User
from app.repositories.tag_repository import TagRepository
from app.schemas.tag import TagCreate, TagResponse, TagUpdate
from app.utils.exceptions import AppException


class TagService:
    def __init__(self, db: AsyncSession):
        self.tag_repo = TagRepository(db)

    async def create_tag(self, data: TagCreate, user: User) -> TagResponse:
        _ = user
        existing = await self.tag_repo.get_by_name(data.name.strip())
        if existing:
            raise AppException(status_code=400, message="Tag name already exists")

        tag = Tag(name=data.name.strip(), color=data.color)
        tag = await self.tag_repo.create(tag)
        return TagResponse.model_validate(tag)

    async def list_tags(
        self, user: User, page: int = 1, page_size: int = 100
    ) -> tuple[list[TagResponse], int]:
        _ = user
        skip = (page - 1) * page_size
        tags, total = await self.tag_repo.list_all(skip, page_size)
        return [TagResponse.model_validate(t) for t in tags], total

    async def get_tag(self, tag_id: UUID, user: User) -> TagResponse:
        _ = user
        tag = await self.tag_repo.get_by_id(tag_id)
        if not tag:
            raise AppException(status_code=404, message="Tag not found")
        return TagResponse.model_validate(tag)

    async def update_tag(self, tag_id: UUID, data: TagUpdate, user: User) -> TagResponse:
        _ = user
        tag = await self.tag_repo.get_by_id(tag_id)
        if not tag:
            raise AppException(status_code=404, message="Tag not found")

        if data.name is not None:
            name = data.name.strip()
            existing = await self.tag_repo.get_by_name(name)
            if existing and existing.id != tag.id:
                raise AppException(status_code=400, message="Tag name already exists")
            tag.name = name
        if data.color is not None:
            tag.color = data.color

        tag = await self.tag_repo.update(tag)
        return TagResponse.model_validate(tag)

    async def delete_tag(self, tag_id: UUID, user: User) -> None:
        _ = user
        tag = await self.tag_repo.get_by_id(tag_id)
        if not tag:
            raise AppException(status_code=404, message="Tag not found")
        await self.tag_repo.delete(tag)

    async def validate_tag_exists(self, tag_id: UUID | None) -> None:
        if tag_id is None:
            return
        tag = await self.tag_repo.get_by_id(tag_id)
        if not tag:
            raise AppException(status_code=404, message="Tag not found")

    async def validate_tags_exist(self, tag_ids: list[UUID] | None) -> list[Tag]:
        if not tag_ids:
            return []
        tags = []
        for tag_id in tag_ids:
            tag = await self.tag_repo.get_by_id(tag_id)
            if not tag:
                raise AppException(status_code=404, message=f"Tag not found: {tag_id}")
            tags.append(tag)
        return tags
