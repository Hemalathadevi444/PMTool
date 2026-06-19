import { useEffect, useMemo, useState } from 'react'
import { getSubtasks } from '../api/client'
import type { Task, TaskStatus } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { TaskStatusIcon } from './TaskStatusIcon'
import { AssigneeAvatar } from './AssigneeAvatar'
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_HEADER_LIGHT,
  STATUS_LABELS,
  formatDate,
  groupTasksByStatus,
  priorityFlag,
  canAddSubtaskAtDepth,
} from '../utils/taskHelpers'

interface TaskBoardProps {
  tasks: Task[]
  workspaceName: string
  projectName: string
  loading: boolean
  onAddTask?: () => void
  onAddSubtask?: (task: Task, depth: number) => void
  onTaskClick?: (taskId: string) => void
}

const STATUS_ORDER: TaskStatus[] = ['done', 'in_progress', 'in_review', 'todo']

export function TaskBoard({
  tasks,
  workspaceName,
  projectName,
  loading,
  onAddTask,
  onAddSubtask,
  onTaskClick,
}: TaskBoardProps) {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [search, setSearch] = useState('')
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(() => new Set())
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Task[]>>({})

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tasks
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false),
    )
  }, [tasks, search])

  const grouped = groupTasksByStatus(filteredTasks)

  async function toggleSubtasks(taskId: string) {
    if (expandedTasks.has(taskId)) {
      setExpandedTasks((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
      return
    }

    setExpandedTasks((prev) => new Set(prev).add(taskId))
    if (!token) return

    try {
      const subs = await getSubtasks(token, taskId)
      setSubtasksMap((prev) => ({ ...prev, [taskId]: subs }))
    } catch {
      setSubtasksMap((prev) => ({ ...prev, [taskId]: [] }))
    }
  }

  useEffect(() => {
    setSearch('')
    setExpandedTasks(new Set())
    setSubtasksMap({})
  }, [projectName])

  useEffect(() => {
    if (!token || expandedTasks.size === 0) {
      setSubtasksMap({})
      return
    }

    let cancelled = false
    const expandedIds = [...expandedTasks]

    Promise.all(
      expandedIds.map(async (taskId) => {
        try {
          const subs = await getSubtasks(token, taskId)
          return [taskId, subs] as const
        } catch {
          return [taskId, []] as const
        }
      }),
    ).then((entries) => {
      if (cancelled) return
      setSubtasksMap(Object.fromEntries(entries))
    })

    return () => {
      cancelled = true
    }
  }, [tasks, token, expandedTasks])

  return (
    <div className="flex flex-1 flex-col overflow-hidden theme-bg">
      <header className="flex items-center gap-4 border-b px-4 py-2 theme-border theme-bg">
        <div className="flex items-center gap-2 text-sm theme-text-secondary">
          <span className="theme-text-muted">{workspaceName}</span>
          <span>/</span>
          <span className="font-medium theme-text">{projectName}</span>
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onAddTask}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f5c9e] bg-[#1f5c9e]"
          >
            + Task
          </button>
        </div>
      </header>

      <div className="flex items-center gap-3 border-b px-4 py-2 theme-border theme-bg">
        <div className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-1.5 theme-border theme-panel">
          <svg className="h-4 w-4 theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-sm theme-text outline-none placeholder:theme-text-muted"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 theme-bg">
        {loading ? (
          <p className="text-sm theme-text-muted">Loading tasks…</p>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium theme-text-secondary">No tasks yet</p>
            <p className="mt-1 text-sm theme-text-muted">
              {search ? 'No tasks match your search.' : 'Create a task or click + Task to get started.'}
            </p>
          </div>
        ) : (
          STATUS_ORDER.map((status) => {
            const statusTasks = grouped[status]
            if (statusTasks.length === 0) return null
            return (
              <section key={status} className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-[11px] font-bold tracking-wide ${
                      theme === 'light'
                        ? `${STATUS_HEADER_LIGHT[status]} border-transparent bg-transparent`
                        : STATUS_COLORS[status]
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs theme-text-muted">{statusTasks.length}</span>
                </div>

                <div className="overflow-hidden rounded-lg border theme-border">
                  <div className="grid grid-cols-[1fr_130px_90px_100px_100px] gap-2 border-b px-4 py-2 text-[11px] font-medium uppercase tracking-wider theme-border theme-panel theme-text-muted">
                    <span>Name</span>
                    <span>Tag</span>
                    <span>Assignee</span>
                    <span>Due date</span>
                    <span>Priority</span>
                  </div>
                  {statusTasks.map((task) => (
                    <TaskRowGroup
                      key={task.id}
                      task={task}
                      depth={0}
                      expandedTasks={expandedTasks}
                      subtasksMap={subtasksMap}
                      onToggleSubtasks={toggleSubtasks}
                      onAddSubtask={onAddSubtask}
                      onTaskClick={onTaskClick}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={onAddTask}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs theme-text-muted theme-hover"
                  >
                    <span>+</span> Add Task
                  </button>
                </div>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}

function TaskRowGroup({
  task,
  depth,
  expandedTasks,
  subtasksMap,
  onToggleSubtasks,
  onAddSubtask,
  onTaskClick,
}: {
  task: Task
  depth: number
  expandedTasks: Set<string>
  subtasksMap: Record<string, Task[]>
  onToggleSubtasks: (taskId: string) => void
  onAddSubtask?: (task: Task, depth: number) => void
  onTaskClick?: (taskId: string) => void
}) {
  const expanded = expandedTasks.has(task.id)
  const subtasks = subtasksMap[task.id] ?? []
  const subtaskCount = task.subtask_count ?? subtasks.length

  return (
    <>
      <TaskRow
        task={task}
        depth={depth}
        expanded={expanded}
        subtaskCount={subtaskCount}
        onToggleExpand={() => onToggleSubtasks(task.id)}
        onAddSubtask={onAddSubtask}
        onClick={() => onTaskClick?.(task.id)}
      />
      {expanded &&
        subtasks.map((sub) => (
          <TaskRowGroup
            key={sub.id}
            task={sub}
            depth={depth + 1}
            expandedTasks={expandedTasks}
            subtasksMap={subtasksMap}
            onToggleSubtasks={onToggleSubtasks}
            onAddSubtask={onAddSubtask}
            onTaskClick={onTaskClick}
          />
        ))}
    </>
  )
}

const DISPLAY_ASSIGNEES = 3

function TaskRow({
  task,
  depth,
  expanded,
  subtaskCount,
  onToggleExpand,
  onAddSubtask,
  onClick,
}: {
  task: Task
  depth: number
  expanded: boolean
  subtaskCount: number
  onToggleExpand: () => void
  onAddSubtask?: (task: Task, depth: number) => void
  onClick: () => void
}) {
  const assignees = task.assignees
    .map((a) => a.user)
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .slice(0, DISPLAY_ASSIGNEES)
  const extraCount = Math.max(0, task.assignees.length - assignees.length)

  const canAddSubtask = onAddSubtask && canAddSubtaskAtDepth(depth, subtaskCount)
  const canExpand = subtaskCount > 0

  return (
    <div className="group flex items-center border-b theme-border last:border-b-0 theme-hover">
      {canAddSubtask ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAddSubtask(task, depth)
          }}
          className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm font-semibold opacity-0 theme-text-muted theme-hover transition-opacity group-hover:opacity-100 focus:opacity-100"
          aria-label={`Add subtask to ${task.title}`}
          title="Add subtask"
        >
          +
        </button>
      ) : (
        <span className="ml-1 w-6 shrink-0" />
      )}
      {canExpand ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="flex h-full w-6 shrink-0 items-center justify-center theme-text-muted"
          aria-label={`Toggle subtasks for ${task.title}`}
          title="Show subtasks"
        >
          <span className={`text-[10px] ${expanded ? '' : '-rotate-90'}`}>▾</span>
        </button>
      ) : (
        <span className="w-6 shrink-0" />
      )}
      <button
        type="button"
        onClick={onClick}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        className="grid min-w-0 flex-1 grid-cols-[1fr_130px_90px_100px_100px] items-center gap-2 py-2.5 pr-4 text-left"
      >
        <div className="flex items-center gap-2">
          <TaskStatusIcon status={task.status} />
          <span className="truncate text-sm theme-text">{task.title}</span>
          {subtaskCount > 0 && (
            <span className="text-[10px] theme-text-muted">↳ {subtaskCount}</span>
          )}
        </div>
        <div>
          <div className="flex flex-wrap gap-1">
            {task.tags && task.tags.length > 0 ? (
              task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex max-w-full truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{ color: tag.color, borderColor: tag.color, backgroundColor: `${tag.color}0a` }}
                >
                  {tag.name}
                </span>
              ))
            ) : (
              <span className="text-xs theme-text-muted">—</span>
            )}
          </div>
        </div>
        <div>
          {assignees.length > 0 ? (
            <div className="flex items-center">
              <div className="flex -space-x-1.5">
                {assignees.map((assignee, index) => (
                  <AssigneeAvatar
                    key={assignee.id}
                    userId={assignee.id}
                    name={assignee.full_name}
                    index={index}
                  />
                ))}
              </div>
              {extraCount > 0 && (
                <span className="ml-1 text-[10px] font-medium theme-text-muted">+{extraCount}</span>
              )}
            </div>
          ) : (
            <span className="text-xs theme-text-muted">—</span>
          )}
        </div>
        <span className="text-xs theme-text-secondary">{formatDate(task.due_date)}</span>
        <span className={`flex items-center gap-1 text-xs ${PRIORITY_COLORS[task.priority]}`}>
          {priorityFlag(task.priority)} {PRIORITY_LABELS[task.priority]}
        </span>
      </button>
    </div>
  )
}
