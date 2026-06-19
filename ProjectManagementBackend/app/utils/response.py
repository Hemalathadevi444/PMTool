from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Success"
    data: T | None = None


class PaginatedData(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Success"
    data: PaginatedData[T] | None = None


def success_response(data: Any = None, message: str = "Success") -> dict[str, Any]:
    return {"success": True, "message": message, "data": data}


def error_response(message: str, status_code: int = 400) -> dict[str, Any]:
    return {"success": False, "message": message, "data": None, "status_code": status_code}


def paginated_response(
    items: list[Any],
    total: int,
    page: int,
    page_size: int,
    message: str = "Success",
) -> dict[str, Any]:
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
    return {
        "success": True,
        "message": message,
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    }
