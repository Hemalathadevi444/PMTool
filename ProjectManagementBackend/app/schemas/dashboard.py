from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_projects: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
