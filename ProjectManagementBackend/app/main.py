from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.controllers import auth, dashboard, projects, tags, tasks, users, workspaces
from app.utils.exceptions import AppException, app_exception_handler, generic_exception_handler, http_exception_handler

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Production-ready Project Management API (ClickUp-like)",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

api_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(workspaces.router, prefix=api_prefix)
app.include_router(projects.router, prefix=api_prefix)
app.include_router(tasks.router, prefix=api_prefix)
app.include_router(tags.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "app": settings.app_name, "version": settings.app_version}
