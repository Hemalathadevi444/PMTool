from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.services.dashboard_service import DashboardService
from app.utils.dependencies import get_current_active_user
from app.utils.response import success_response

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", summary="Get dashboard statistics")
async def get_dashboard_stats(
    workspace_id: UUID | None = Query(None, description="Filter stats by workspace"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = DashboardService(db)
    stats = await service.get_stats(current_user, workspace_id=workspace_id)
    return success_response(data=stats.model_dump(), message="Dashboard stats retrieved")
