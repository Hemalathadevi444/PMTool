import type { Task, TaskPriority, TaskStatus } from '../api/types'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  done: 'COMPLETED',
  in_progress: 'IN PROGRESS',
  in_review: 'IN REVIEW',
  todo: 'TO DO',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  done: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700/50',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50',
  in_review: 'bg-amber-100 text-amber-850 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
  todo: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-300 dark:border-zinc-600/50',
}

export const STATUS_HEADER_LIGHT: Record<TaskStatus, string> = {
  done: 'text-emerald-600',
  in_progress: 'text-violet-600',
  in_review: 'text-amber-600',
  todo: 'text-slate-500',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-zinc-400',
}

export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  }
  for (const task of tasks) {
    groups[task.status].push(task)
  }
  return groups
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const datePart = dateStr.split('T')[0]
  const parts = datePart.split('-')
  if (parts.length === 3) {
    const year = parts[0]
    const month = parts[1].padStart(2, '0')
    const day = parts[2].padStart(2, '0')
    return `${day}/${month}/${year}`
  }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function priorityFlag(priority: TaskPriority): string {
  if (priority === 'urgent' || priority === 'high') return '🚩'
  return ''
}

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Completed' },
]

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

/** Root tasks may have subtasks (depth 0); subtasks (depth 1) cannot have children. */
export function canAddSubtaskAtDepth(depth: number, _subtaskCount: number): boolean {
  if (depth >= 1) return false
  return true
}

export function getSubtaskLimitMessage(_depth: number): string {
  return 'Sub tasks cannot have nested sub tasks.'
}

