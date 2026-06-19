-- Project Management Tool - PostgreSQL schema
-- Run as postgres superuser, then connect to the new database and run the rest.
--
-- Step 1 (optional - if database does not exist yet):
-- CREATE DATABASE projectmanagementtool;
-- \c projectmanagementtool

-- Enum types
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ix_users_email ON users (email);

-- Workspaces
CREATE TABLE workspaces (
    id          UUID PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace members
CREATE TABLE workspace_members (
    id           UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         workspace_role NOT NULL,
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_workspace_user UNIQUE (workspace_id, user_id)
);

-- Projects
CREATE TABLE projects (
    id             UUID PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_projects_workspace_id ON projects (workspace_id);

-- Tasks
CREATE TABLE tasks (
    id             UUID PRIMARY KEY,
    title          VARCHAR(500) NOT NULL,
    description    TEXT,
    status         task_status NOT NULL,
    priority       task_priority NOT NULL,
    due_date       DATE,
    project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    created_by_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_tasks_project_id ON tasks (project_id);
CREATE INDEX ix_tasks_status ON tasks (status);
CREATE INDEX ix_tasks_parent_task_id ON tasks (parent_task_id);

-- Task assignees
CREATE TABLE task_assignees (
    id          UUID PRIMARY KEY,
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_task_user UNIQUE (task_id, user_id)
);

-- Comments
CREATE TABLE comments (
    id         UUID PRIMARY KEY,
    content    TEXT NOT NULL,
    task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_comments_task_id ON comments (task_id);

-- Tags (global — shared across all tasks)
CREATE TABLE tags (
    id         UUID PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    color      VARCHAR(7) NOT NULL DEFAULT '#8b5cf6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN tag_id UUID REFERENCES tags(id) ON DELETE SET NULL;
CREATE INDEX ix_tasks_tag_id ON tasks (tag_id);

-- Optional: mark schema as up-to-date for Alembic (migration 005)
CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL PRIMARY KEY
);
INSERT INTO alembic_version (version_num) VALUES ('005');
