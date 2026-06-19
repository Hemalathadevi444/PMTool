from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.schemas.tag import TagCreate, TagUpdate
from app.services.tag_service import TagService
from app.utils.dependencies import get_current_active_user
from app.utils.response import paginated_response, success_response

router = APIRouter(prefix="/tags", tags=["Tags"])


@router.post("", summary="Create a tag")
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TagService(db)
    tag = await service.create_tag(data, current_user)
    return success_response(data=tag.model_dump(mode="json"), message="Tag created")


@router.get("", summary="List all tags")
async def list_tags(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TagService(db)
    tags, total = await service.list_tags(current_user, page, page_size)
    return paginated_response(
        items=[t.model_dump(mode="json") for t in tags],
        total=total,
        page=page,
        page_size=page_size,
        message="Tags retrieved",
    )


@router.get("/{tag_id}", summary="Get tag by ID")
async def get_tag(
    tag_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TagService(db)
    tag = await service.get_tag(tag_id, current_user)
    return success_response(data=tag.model_dump(mode="json"), message="Tag retrieved")


@router.patch("/{tag_id}", summary="Update tag")
async def update_tag(
    tag_id: UUID,
    data: TagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TagService(db)
    tag = await service.update_tag(tag_id, data, current_user)
    return success_response(data=tag.model_dump(mode="json"), message="Tag updated")


@router.delete("/{tag_id}", summary="Delete tag")
async def delete_tag(
    tag_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = TagService(db)
    await service.delete_tag(tag_id, current_user)
    return success_response(data=None, message="Tag deleted")
