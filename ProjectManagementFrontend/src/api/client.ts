import { request } from './http'
import type { Comment, PaginatedData, Project, Tag, Task, TaskPriority, TaskStatus, User, Workspace } from './types'

export { ApiError } from './http'

export async function getWorkspaces(token: string): Promise<Workspace[]> {
  const data = await request<PaginatedData<Workspace>>('/workspaces', {}, token)
  return data.items
}

/** POST /workspaces — body: { name, description? } */
export interface CreateWorkspaceRequest {
  name: string
  description?: string | null
}

export async function updateWorkspace(
  token: string,
  workspaceId: string,
  payload: { name?: string; description?: string | null },
): Promise<Workspace> {
  return request<Workspace>(
    `/workspaces/${workspaceId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export async function createWorkspace(
  token: string,
  payload: CreateWorkspaceRequest,
): Promise<Workspace> {
  return request<Workspace>(
    '/workspaces',
    {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        description: payload.description || null,
      }),
    },
    token,
  )
}

export async function getProjects(token: string, workspaceId?: string): Promise<Project[]> {
  const query = workspaceId ? `?workspace_id=${workspaceId}` : ''
  const data = await request<PaginatedData<Project>>(`/projects${query}`, {}, token)
  return data.items
}

/** POST /projects — body: { name, description?, workspace_id, issue_type, category, owner_id } */
export interface CreateProjectRequest {
  name: string
  description?: string | null
  workspace_id: string
  tag_ids?: string[]
  status?: TaskStatus
  issue_type: string
  category: string
  priority: string
  owner_id: string
  due_date?: string | null
}

export async function updateProject(
  token: string,
  projectId: string,
  payload: {
    name?: string
    description?: string | null
    tag_ids?: string[]
    status?: TaskStatus
    issue_type?: string
    category?: string
    priority?: string
    owner_id?: string
    due_date?: string | null
  },
): Promise<Project> {
  return request<Project>(
    `/projects/${projectId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export async function createProject(
  token: string,
  payload: CreateProjectRequest,
): Promise<Project> {
  return request<Project>(
    '/projects',
    {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        description: payload.description || null,
        workspace_id: payload.workspace_id,
        tag_ids: payload.tag_ids ?? [],
        status: payload.status,
        issue_type: payload.issue_type,
        category: payload.category,
        priority: payload.priority,
        owner_id: payload.owner_id,
        due_date: payload.due_date || null,
      }),
    },
    token,
  )
}

export async function getTasks(
  token: string,
  options?: {
    projectId?: string
    search?: string
    assigneeId?: string
    rootOnly?: boolean
  },
): Promise<Task[]> {
  const params = new URLSearchParams({ page_size: '100' })
  if (options?.projectId) params.set('project_id', options.projectId)
  if (options?.search) params.set('q', options.search)
  if (options?.assigneeId) params.set('assignee_id', options.assigneeId)
  if (options?.rootOnly === false) params.set('root_only', 'false')
  const data = await request<PaginatedData<Task>>(`/tasks?${params}`, {}, token)
  return data.items
}

export async function getTask(token: string, taskId: string): Promise<Task> {
  return request<Task>(`/tasks/${taskId}`, {}, token)
}

export async function searchProjects(token: string, q: string): Promise<Project[]> {
  const params = new URLSearchParams({ q, page_size: '20' })
  const data = await request<PaginatedData<Project>>(`/projects?${params}`, {}, token)
  return data.items
}

export async function searchTasks(token: string, q: string): Promise<Task[]> {
  const params = new URLSearchParams({ q, page_size: '20', root_only: 'false' })
  const data = await request<PaginatedData<Task>>(`/tasks?${params}`, {}, token)
  return data.items
}

/** GET /users — paginated list of users for assignee picker */
export async function getTags(token: string): Promise<Tag[]> {
  const params = new URLSearchParams({ page_size: '100' })
  const data = await request<PaginatedData<Tag>>(`/tags?${params}`, {}, token)
  return data.items
}

export interface CreateTagRequest {
  name: string
  color?: string
}

export async function createTag(token: string, payload: CreateTagRequest): Promise<Tag> {
  return request<Tag>(
    '/tags',
    {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        color: payload.color ?? '#8b5cf6',
      }),
    },
    token,
  )
}

export interface UpdateTagRequest {
  name?: string
  color?: string
}

export async function updateTag(token: string, tagId: string, payload: UpdateTagRequest): Promise<Tag> {
  return request<Tag>(`/tags/${tagId}`, { method: 'PATCH', body: JSON.stringify(payload) }, token)
}

export async function deleteTag(token: string, tagId: string): Promise<void> {
  await request<null>(`/tags/${tagId}`, { method: 'DELETE' }, token)
}

export async function getUsers(token: string): Promise<User[]> {
  const data = await request<PaginatedData<User>>('/users?page_size=100', {}, token)
  return data.items
}

/** POST /tasks — body: { title, project_id, status?, priority?, description?, due_date?, assignee_ids? } */
export interface CreateTaskRequest {
  title: string
  description?: string | null
  project_id: string
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  assignee_ids?: string[]
  tag_ids?: string[]
}

export async function createTask(token: string, payload: CreateTaskRequest): Promise<Task> {
  return request<Task>(
    '/tasks',
    {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        description: payload.description || null,
        project_id: payload.project_id,
        status: payload.status ?? 'todo',
        priority: payload.priority ?? 'medium',
        due_date: payload.due_date || null,
        assignee_ids: payload.assignee_ids ?? [],
        tag_ids: payload.tag_ids ?? [],
      }),
    },
    token,
  )
}

export async function updateTask(
  token: string,
  taskId: string,
  payload: UpdateTaskRequest,
): Promise<Task> {
  return request<Task>(
    `/tasks/${taskId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export async function getSubtasks(token: string, taskId: string): Promise<Task[]> {
  const data = await request<Task[]>(`/tasks/${taskId}/subtasks`, {}, token)
  return data
}

export interface CreateSubTaskRequest {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  assignee_ids?: string[]
  tag_ids?: string[]
}

export async function createSubtask(
  token: string,
  taskId: string,
  payload: CreateSubTaskRequest,
): Promise<Task> {
  return request<Task>(
    `/tasks/${taskId}/subtasks`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        description: payload.description || null,
        status: payload.status ?? 'todo',
        priority: payload.priority ?? 'medium',
        due_date: payload.due_date || null,
        assignee_ids: payload.assignee_ids ?? [],
        tag_ids: payload.tag_ids ?? [],
      }),
    },
    token,
  )
}

export async function replaceTaskAssignees(
  token: string,
  taskId: string,
  userIds: string[],
): Promise<Task> {
  return request<Task>(
    `/tasks/${taskId}/assignees`,
    { method: 'PUT', body: JSON.stringify({ user_ids: userIds }) },
    token,
  )
}

/** PATCH /tasks/{id} */
export interface UpdateTaskRequest {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  tag_ids?: string[]
}

export async function getCurrentUser(token: string): Promise<User> {
  return request<User>('/users/me', {}, token)
}

export async function getComments(token: string, projectId: string): Promise<Comment[]> {
  const data = await request<Comment[]>(`/projects/${projectId}/comments`, {}, token)
  return data
}

export async function addComment(token: string, projectId: string, content: string): Promise<Comment> {
  return request<Comment>(
    `/projects/${projectId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
    token,
  )
}

export async function getTaskComments(token: string, taskId: string): Promise<Comment[]> {
  const data = await request<Comment[]>(`/tasks/${taskId}/comments`, {}, token)
  return data
}

export async function addTaskComment(token: string, taskId: string, content: string): Promise<Comment> {
  return request<Comment>(
    `/tasks/${taskId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
    token,
  )
}

export async function getProject(token: string, projectId: string): Promise<Project> {
  return request<Project>(`/projects/${projectId}`, {}, token)
}

