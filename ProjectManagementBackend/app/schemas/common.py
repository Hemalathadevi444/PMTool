from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class APIResponseSchema(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Success"
    data: T | None = None


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginatedMeta(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


class IDSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
