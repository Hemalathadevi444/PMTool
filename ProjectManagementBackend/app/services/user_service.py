from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse, UserUpdate
from app.utils.exceptions import AppException


class UserService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    async def get_user(self, user_id: UUID) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AppException(status_code=404, message="User not found")
        return UserResponse.model_validate(user)

    async def list_users(self, page: int, page_size: int) -> tuple[list[UserResponse], int]:
        skip = (page - 1) * page_size
        users, total = await self.user_repo.list_users(skip=skip, limit=page_size)
        return [UserResponse.model_validate(u) for u in users], total

    async def update_user(self, user_id: UUID, data: UserUpdate, current_user: User) -> UserResponse:
        if current_user.id != user_id:
            raise AppException(status_code=403, message="Not authorized to update this user")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AppException(status_code=404, message="User not found")

        if data.full_name is not None:
            user.full_name = data.full_name
        if data.is_active is not None:
            user.is_active = data.is_active

        user = await self.user_repo.update(user)
        return UserResponse.model_validate(user)
