# Project Management Backend

Production-ready FastAPI backend for a ClickUp-like project management tool with PostgreSQL, SQLAlchemy ORM, Alembic migrations, and JWT authentication.

## Tech Stack

- **FastAPI** – async REST API with OpenAPI/Swagger
- **PostgreSQL** – relational database
- **SQLAlchemy 2.0** – async ORM
- **Pydantic v2** – request/response validation
- **Alembic** – database migrations
- **JWT** – bearer token authentication

## Project Structure

```
app/
├── controllers/     # API routes (thin layer)
├── services/        # Business logic
├── repositories/    # Database access
├── models/          # SQLAlchemy models
├── schemas/         # Pydantic schemas
├── database/        # Engine & session
└── utils/           # Security, responses, dependencies
alembic/             # Migrations
scripts/             # Seed data
```

## Features

| Module | Endpoints |
|--------|-----------|
| **Auth** | Signup, Login |
| **Users** | Profile, list, update |
| **Workspaces** | Create, update, list |
| **Projects** | CRUD, search, pagination |
| **Tasks** | CRUD, assignees, status, priority, due dates, comments |
| **Dashboard** | Total projects/tasks, completed/pending counts |

## Prerequisites

- Python 3.11+
- PostgreSQL 14+

## Setup

### 1. Clone and create virtual environment

```bash
cd ProjectManagementBackend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

Edit `.env` with your PostgreSQL credentials and a strong `SECRET_KEY`.

### 4. Create database

```sql
CREATE DATABASE project_management;
```

### 5. Run migrations

```bash
alembic upgrade head
```

### 6. Seed sample data (optional)

```bash
python -m scripts.seed_data
```

### 7. Start the server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

| URL | Description |
|-----|-------------|
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/redoc | ReDoc |
| http://localhost:8000/health | Health check |

All API routes are prefixed with `/api/v1`.

## Authentication

1. **Signup**: `POST /api/v1/auth/signup`
2. **Login**: `POST /api/v1/auth/login`
3. Use the returned `access_token` in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Seed credentials

| Email | Password |
|-------|----------|
| admin@example.com | Admin@12345 |
| member@example.com | Member@12345 |

## Response Format

All endpoints return a consistent JSON structure:

```json
{
  "success": true,
  "message": "Success",
  "data": { }
}
```

Paginated list endpoints:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5
  }
}
```

## Key API Examples

### Create workspace

```http
POST /api/v1/workspaces
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Workspace",
  "description": "Team workspace"
}
```

### Create project

```http
POST /api/v1/projects
{
  "name": "Mobile App",
  "description": "iOS and Android app",
  "workspace_id": "<workspace-uuid>"
}
```

### Create task with assignees

```http
POST /api/v1/tasks
{
  "title": "Fix login bug",
  "project_id": "<project-uuid>",
  "priority": "high",
  "due_date": "2026-06-01",
  "assignee_ids": ["<user-uuid>"]
}
```

### Search projects

```http
GET /api/v1/projects?q=website&page=1&page_size=20
```

### Search tasks

```http
GET /api/v1/tasks?q=bug&status=todo&priority=high
```

### Dashboard stats

```http
GET /api/v1/dashboard/stats?workspace_id=<optional-uuid>
```

## Development

### Create a new migration

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Run without reload

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## License

MIT
