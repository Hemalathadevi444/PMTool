from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import UserService
from app.utils.dependencies import get_current_active_user
from app.utils.response import paginated_response, success_response

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", summary="Get current user profile")
async def get_me(current_user: User = Depends(get_current_active_user)):
    return success_response(
        data=UserResponse.model_validate(current_user).model_dump(),
        message="Profile retrieved",
    )


@router.get("", summary="List all users (paginated)")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    service = UserService(db)
    users, total = await service.list_users(page, page_size)
    return paginated_response(
        items=[u.model_dump() for u in users],
        total=total,
        page=page,
        page_size=page_size,
        message="Users retrieved",
    )


@router.get("/{user_id}", summary="Get user by ID")
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    service = UserService(db)
    user = await service.get_user(user_id)
    return success_response(data=user.model_dump(), message="User retrieved")


@router.patch("/{user_id}", summary="Update user profile")
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = UserService(db)
    user = await service.update_user(user_id, data, current_user)
    return success_response(data=user.model_dump(), message="User updated")
