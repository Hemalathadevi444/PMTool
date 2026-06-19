export interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthData {
  access_token: string
  token_type: string
  user: User
}

export interface LoginResponse {
  require_otp: boolean
  email: string
  message: string
  otp?: string
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Tag {
  id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  workspace_id: string
  created_by_id: string | null
  status: TaskStatus
  issue_type: string | null
  category: string | null
  priority: string | null
  owner_id: string | null
  owner: { id: string; full_name: string; email: string } | null
  due_date: string | null
  tags: Tag[]
  created_at: string
  updated_at: string
}

export interface TaskAssignee {
  id: string
  user_id: string
  assigned_at: string
  user?: User | null
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  project_id: string
  parent_task_id: string | null
  created_by_id: string | null
  created_at: string
  updated_at: string
  tags: Tag[]
  assignees: TaskAssignee[]
  subtask_count?: number
}

export interface Comment {
  id: string
  content: string
  project_id?: string | null
  task_id?: string | null
  author_id: string
  created_at: string
  updated_at: string
  author: User | null
}
