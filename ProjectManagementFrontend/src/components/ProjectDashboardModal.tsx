import React, { useState, useEffect, useCallback } from 'react'
import { addComment, getComments, updateTask } from '../api/client'
import { ApiError } from '../api/http'
import type { Comment, Project, Tag, Task, User, TaskPriority, TaskStatus } from '../api/types'
import { formatDate, initials, STATUS_COLORS, STATUS_LABELS, TASK_STATUS_OPTIONS } from '../utils/taskHelpers'
import { AssigneeAvatar } from './AssigneeAvatar'

interface ProjectDashboardModalProps {
  open: boolean
  project: Project | null
  tasks: Task[]
  users: User[]
  tags: Tag[]
  token: string | null
  onClose: () => void
  onTaskClick: (taskId: string, projectId: string) => void
  onCreateTaskInline?: (projectId: string) => void
  onAddSubtaskInline?: (parentTask: Task) => void
  onEditProject?: (projectId: string) => void
  onRefresh?: () => Promise<void>
}

const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export function ProjectDashboardModal({
  open,
  project,
  tasks,
  users,
  tags,
  token,
  onClose,
  onTaskClick,
  onCreateTaskInline,
  onAddSubtaskInline,
  onEditProject,
  onRefresh,
}: ProjectDashboardModalProps) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({})
  const [searchTaskName, setSearchTaskName] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterTag, setFilterTag] = useState('all')
  const [filterDueDate, setFilterDueDate] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeHeaderFilter, setActiveHeaderFilter] = useState<'name' | 'tags' | 'assignee' | 'dueDate' | 'priority' | 'status' | null>(null)
  const [activePrioritySelectTaskId, setActivePrioritySelectTaskId] = useState<string | null>(null)
  const [activeStatusSelectTaskId, setActiveStatusSelectTaskId] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (
        !target.closest('.header-filter-dropdown') &&
        !target.closest('.header-filter-toggle') &&
        !target.closest('.priority-dropdown') &&
        !target.closest('.priority-toggle') &&
        !target.closest('.status-dropdown') &&
        !target.closest('.status-toggle')
      ) {
        setActiveHeaderFilter(null)
        setActivePrioritySelectTaskId(null)
        setActiveStatusSelectTaskId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset filter states when project changes
  useEffect(() => {
    if (project) {
      setExpandedTaskIds({})
      setSearchTaskName('')
      setFilterAssignee('all')
      setFilterTag('all')
      setFilterDueDate('all')
      setFilterPriority('all')
      setFilterStatus('all')
      setActiveHeaderFilter(null)
      setActivePrioritySelectTaskId(null)
      setActiveStatusSelectTaskId(null)
    }
  }, [project])

  if (!open || !project) return null

  const projectTasks = tasks.filter((t) => t.project_id === project.id)

  const handleUpdatePriority = async (taskId: string, newPriority: TaskPriority) => {
    if (!token) return
    try {
      await updateTask(token, taskId, { priority: newPriority })
      if (onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      console.error('Failed to update task priority:', err)
    }
  }

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!token) return
    try {
      setNotification(null)
      await updateTask(token, taskId, { status: newStatus })
      if (onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update task status'
      setNotification(msg)
      setTimeout(() => setNotification(null), 6000)
      console.error('Failed to update task status:', err)
    }
  }

  const toggleExpandTask = (taskId: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }))
  }

  const renderPriorityFlag = (priority: TaskPriority) => {
    let flagColor = 'text-zinc-400'
    let label = 'Low'
    if (priority === 'urgent') {
      flagColor = 'text-red-500'
      label = 'Urgent'
    } else if (priority === 'high') {
      flagColor = 'text-orange-500'
      label = 'High'
    } else if (priority === 'medium') {
      flagColor = 'text-yellow-500'
      label = 'Medium'
    }

    return (
      <div className="flex items-center gap-1.5 select-none text-[10px]">
        <svg className={`h-3 w-3 ${flagColor} fill-current`} viewBox="0 0 24 24">
          <path d="M4 2v20h-2v-20h2zm18 4l-4 5 4 5h-16v-10h16z" />
        </svg>
        <span className="theme-text-secondary font-medium">{label}</span>
      </div>
    )
  }

  // Filter Tasks list
  const filteredTasks = projectTasks.filter((task) => {
    if (searchTaskName.trim()) {
      const q = searchTaskName.toLowerCase()
      if (!task.title.toLowerCase().includes(q)) return false
    }

    if (filterAssignee !== 'all') {
      const isAssigned = task.assignees?.some((a) => a.user_id === filterAssignee)
      if (!isAssigned) return false
    }

    if (filterTag !== 'all') {
      const hasTag = task.tags?.some((t) => t.id === filterTag)
      if (!hasTag) return false
    }

    if (filterPriority !== 'all') {
      if (task.priority !== filterPriority) return false
    }

    if (filterStatus !== 'all') {
      if (task.status !== filterStatus) return false
    }

    if (filterDueDate !== 'all') {
      if (filterDueDate === 'has_date' && !task.due_date) return false
      if (filterDueDate === 'no_date' && task.due_date) return false
      if (filterDueDate === 'overdue') {
        if (!task.due_date || task.status === 'done') return false
        const todayStr = new Date().toISOString().split('T')[0]
        const taskDateStr = task.due_date.split('T')[0]
        if (taskDateStr >= todayStr) return false
      }
    }

    return true
  })

  const matchedTaskIds = new Set(filteredTasks.map((t) => t.id))

  const visibleRootTasks = projectTasks.filter((t) => {
    if (t.parent_task_id) return false
    const hasMatchingSubtask = projectTasks.some(
      (sub) => sub.parent_task_id === t.id && matchedTaskIds.has(sub.id)
    )
    return matchedTaskIds.has(t.id) || hasMatchingSubtask
  })

  return (
    <div
      className="theme-overlay fixed inset-0 z-40 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="theme-modal w-full max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dashboard-title"
      >
        {notification && (
          <div className="mx-6 mt-4 p-3 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 rounded-lg text-xs flex justify-between items-center animate-fade-in shadow-sm shrink-0">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="font-bold ml-2 text-red-900 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200">✕</button>
          </div>
        )}
        {/* Header Section */}
        <div className="flex items-start justify-between p-6 border-b theme-border shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3.5 flex-wrap">
              <h2 id="project-dashboard-title" className="text-xl font-bold theme-text tracking-wide truncate max-w-xl">
                {project.name}
              </h2>
              {onEditProject && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditProject(project.id)
                  }}
                  className="rounded p-1 text-zinc-400 hover:text-violet-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  title="Edit Project Name"
                  aria-label="Edit project"
                >
                  <svg
                    className="h-4.5 w-4.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              )}
            </div>
            {project.description && (
              <p className="mt-2 text-sm theme-text-secondary leading-relaxed break-words max-w-3xl">
                {project.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 ml-4"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 theme-bg">
          {/* Tasks & Subtasks column */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold theme-text uppercase tracking-wider flex items-center gap-1.5">
                Tasks &amp; Subtasks
                <span className="bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {projectTasks.length}
                </span>
              </h3>

              {onCreateTaskInline && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateTaskInline(project.id)
                  }}
                  className="inline-flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[11px] px-3.5 py-1.5 rounded-lg shadow-md transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer select-none"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Task
                </button>
              )}
            </div>

            {/* Tasks Table Panel */}
            <div className="border theme-border rounded-xl theme-modal overflow-hidden bg-white dark:bg-zinc-900/40 flex-1 min-h-[300px]">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/30 text-[9px] font-bold uppercase tracking-wider theme-text-muted border-b theme-border shrink-0 select-none">
                {/* Name header */}
                <div className="col-span-3 flex items-center gap-1 relative">
                  <span>Name</span>
                  <button
                    onClick={() => setActiveHeaderFilter((p) => (p === 'name' ? null : 'name'))}
                    className="header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                    title="Filter Name"
                  >
                    <svg className={`h-2.5 w-2.5 ${searchTaskName ? 'text-violet-500 font-bold' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {activeHeaderFilter === 'name' && (
                    <div className="header-filter-dropdown absolute left-0 top-7 w-56 rounded-lg shadow-xl p-2.5 z-50 border theme-border theme-modal" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={searchTaskName}
                        onChange={(e) => setSearchTaskName(e.target.value)}
                        placeholder="Search name..."
                        className="w-full text-xs rounded border px-2 py-1.5 theme-input outline-none focus:border-violet-500"
                        autoFocus
                      />
                      {searchTaskName && (
                        <button
                          type="button"
                          onClick={() => setSearchTaskName('')}
                          className="mt-2 text-[10px] text-violet-500 hover:underline cursor-pointer block text-left"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Tags header */}
                <div className="col-span-2 flex items-center gap-1 relative">
                  <span>Tags</span>
                  <button
                    onClick={() => setActiveHeaderFilter((p) => (p === 'tags' ? null : 'tags'))}
                    className="header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                    title="Filter Tags"
                  >
                    <svg className={`h-2.5 w-2.5 ${filterTag !== 'all' ? 'text-violet-500 font-bold' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {activeHeaderFilter === 'tags' && (
                    <div className="header-filter-dropdown absolute left-0 top-7 w-48 rounded-lg shadow-xl py-1 z-50 border theme-border theme-modal" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setFilterTag('all'); setActiveHeaderFilter(null) }}
                        className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer ${filterTag === 'all' ? 'text-violet-500 font-semibold bg-violet-500/10' : ''}`}
                      >
                        All Tags
                      </button>
                      <div className="max-h-40 overflow-y-auto divide-y theme-border">
                        {tags.length === 0 ? (
                          <div className="px-3 py-2 text-[10px] theme-text-muted">No tags created yet</div>
                        ) : (
                          tags.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => { setFilterTag(t.id); setActiveHeaderFilter(null) }}
                              className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5 ${filterTag === t.id ? 'text-violet-500 font-semibold bg-violet-500/10' : ''}`}
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                              <span className="truncate">{t.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignee header */}
                <div className="col-span-1 flex items-center gap-1 relative">
                  <span>Assignee</span>
                  <button
                    onClick={() => setActiveHeaderFilter((p) => (p === 'assignee' ? null : 'assignee'))}
                    className="header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                    title="Filter Assignee"
                  >
                    <svg className={`h-2.5 w-2.5 ${filterAssignee !== 'all' ? 'text-violet-500 font-bold' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {activeHeaderFilter === 'assignee' && (
                    <div className="header-filter-dropdown absolute left-0 top-7 w-48 rounded-lg shadow-xl py-1 z-50 border theme-border theme-modal" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setFilterAssignee('all'); setActiveHeaderFilter(null) }}
                        className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer ${filterAssignee === 'all' ? 'text-violet-500 font-semibold bg-violet-500/10' : ''}`}
                      >
                        All Assignees
                      </button>
                      <div className="max-h-40 overflow-y-auto divide-y theme-border">
                        {users.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => { setFilterAssignee(u.id); setActiveHeaderFilter(null) }}
                            className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer ${filterAssignee === u.id ? 'text-violet-500 font-semibold bg-violet-500/10' : ''}`}
                          >
                            {u.full_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Due Date header */}
                <div className="col-span-2 flex items-center gap-1 relative">
                  <span>Due Date</span>
                  <button
                    onClick={() => setActiveHeaderFilter((p) => (p === 'dueDate' ? null : 'dueDate'))}
                    className="header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                    title="Filter Due Date"
                  >
                    <svg className={`h-2.5 w-2.5 ${filterDueDate !== 'all' ? 'text-violet-500 font-bold' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {activeHeaderFilter === 'dueDate' && (
                    <div className="header-filter-dropdown absolute left-0 top-7 w-48 rounded-lg shadow-xl py-1 z-50 border theme-border theme-modal" onClick={(e) => e.stopPropagation()}>
                      {[
                        { value: 'all', label: 'All Dates' },
                        { value: 'has_date', label: 'Has Due Date' },
                        { value: 'no_date', label: 'No Due Date' },
                        { value: 'overdue', label: 'Overdue' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setFilterDueDate(opt.value); setActiveHeaderFilter(null) }}
                          className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer ${filterDueDate === opt.value ? 'text-violet-500 font-semibold bg-violet-500/10' : ''}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Priority header */}
                <div className="col-span-2 flex items-center gap-1 relative">
                  <span>Priority</span>
                  <button
                    onClick={() => setActiveHeaderFilter((p) => (p === 'priority' ? null : 'priority'))}
                    className="header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                    title="Filter Priority"
                  >
                    <svg className={`h-2.5 w-2.5 ${filterPriority !== 'all' ? 'text-violet-500 font-bold' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {activeHeaderFilter === 'priority' && (
                    <div className="header-filter-dropdown absolute right-0 top-7 w-44 rounded-lg shadow-xl py-1 z-50 border theme-border theme-modal" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setFilterPriority('all'); setActiveHeaderFilter(null) }}
                        className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer ${filterPriority === 'all' ? 'text-violet-500 font-semibold bg-violet-500/10' : ''}`}
                      >
                        All Priorities
                      </button>
                      {[
                        { value: 'urgent', label: 'Urgent' },
                        { value: 'high', label: 'High' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'low', label: 'Low' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setFilterPriority(opt.value); setActiveHeaderFilter(null) }}
                          className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer ${filterPriority === opt.value ? 'text-violet-500 font-semibold bg-violet-500/10' : ''}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status header */}
                <div className="col-span-2 flex items-center gap-1 relative justify-between">
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <button
                      onClick={() => setActiveHeaderFilter((p) => (p === 'status' ? null : 'status'))}
                      className="header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Filter Status"
                    >
                      <svg className={`h-2.5 w-2.5 ${filterStatus !== 'all' ? 'text-violet-500 font-bold' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>
                  {activeHeaderFilter === 'status' && (
                    <div className="header-filter-dropdown absolute right-0 top-7 w-44 rounded-lg shadow-xl py-1 z-50 border theme-border theme-modal" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setFilterStatus('all'); setActiveHeaderFilter(null) }}
                        className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer ${filterStatus === 'all' ? 'text-violet-500 font-semibold bg-violet-500/10' : ''}`}
                      >
                        All Statuses
                      </button>
                      {TASK_STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setFilterStatus(opt.value); setActiveHeaderFilter(null) }}
                          className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer ${filterStatus === opt.value ? 'text-violet-500 font-semibold bg-violet-500/10' : ''}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y theme-border max-h-[55vh] overflow-y-auto">
                {visibleRootTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-xs theme-text-muted">
                    <p className="font-semibold">No tasks match your filters</p>
                    <p className="mt-1 opacity-75">Try clearing filters or search.</p>
                  </div>
                ) : (
                  visibleRootTasks.map((task) => {
                    const subs = projectTasks.filter(
                      (s) => s.parent_task_id === task.id && matchedTaskIds.has(s.id)
                    )
                    const hasSubtasks = subs.length > 0
                    const isExpanded = expandedTaskIds[task.id]

                    return (
                      <React.Fragment key={task.id}>
                        {/* Parent Row */}
                        <div className="grid grid-cols-12 gap-3 px-4 py-2 items-center hover:bg-zinc-50/20 dark:hover:bg-zinc-800/10 transition-colors border-b theme-border last:border-b-0 group">
                          {/* Name column */}
                          <div className="col-span-3 flex items-center gap-2 min-w-0">
                            {/* Collapse Arrow */}
                            {hasSubtasks ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleExpandTask(task.id)
                                }}
                                className="text-zinc-400 hover:text-violet-500 font-bold focus:outline-none w-4 h-4 flex items-center justify-center cursor-pointer select-none shrink-0 transition-transform text-[8px]"
                                title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            ) : (
                              <span className="w-4 h-4 shrink-0" />
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onTaskClick(task.id, project.id)
                              }}
                              className="text-[12px] font-semibold theme-text hover:text-violet-500 text-left truncate cursor-pointer focus:outline-none"
                            >
                              {task.title}
                            </button>
                            {/* Quick Subtask button */}
                            {onAddSubtaskInline && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onAddSubtaskInline(task)
                                }}
                                className="text-[10px] text-violet-500 hover:text-violet-400 hover:underline shrink-0 font-semibold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                title="Add Subtask"
                              >
                                + Subtask
                              </button>
                            )}
                          </div>

                          {/* Tags column */}
                          <div className="col-span-2 flex gap-1 flex-wrap shrink-0">
                            {task.tags?.map((t) => (
                              <span
                                key={t.id}
                                className="text-[8px] px-1.5 py-0.5 border rounded-md font-semibold"
                                style={{
                                  color: t.color,
                                  borderColor: t.color,
                                  backgroundColor: `${t.color}0d`,
                                }}
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>

                          {/* Assignee column */}
                          <div className="col-span-1 flex items-center justify-start">
                            {task.assignees && task.assignees.length > 0 ? (
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {task.assignees.map((assignee, idx) => {
                                  const u = users.find((user) => user.id === assignee.user_id)
                                  const name = u ? u.full_name : 'Unknown'
                                  return (
                                    <AssigneeAvatar
                                      key={assignee.id}
                                      userId={assignee.user_id}
                                      name={name}
                                      index={idx}
                                      size="sm"
                                      className="ring-1 ring-white dark:ring-zinc-900"
                                    />
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="text-[11px] theme-text-muted">—</span>
                            )}
                          </div>

                          {/* Due Date column */}
                          <div className="col-span-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {task.due_date ? formatDate(task.due_date) : <span className="theme-text-muted">—</span>}
                          </div>

                          {/* Priority column */}
                          <div className="col-span-2 relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActivePrioritySelectTaskId((p) =>
                                  p === task.id ? null : task.id
                                )
                              }}
                              className="priority-toggle flex items-center gap-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 px-1 py-0.5 rounded cursor-pointer transition focus:outline-none"
                              title="Edit Priority"
                            >
                              {renderPriorityFlag(task.priority)}
                              <svg className="h-2 w-2 text-zinc-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {activePrioritySelectTaskId === task.id && (
                              <div className="priority-dropdown absolute right-0 top-7 w-32 rounded-lg shadow-xl py-1 z-50 border theme-border theme-modal" onClick={(e) => e.stopPropagation()}>
                                {TASK_PRIORITY_OPTIONS.map((o) => (
                                  <button
                                    key={o.value}
                                    type="button"
                                    onClick={async () => {
                                      await handleUpdatePriority(task.id, o.value)
                                      setActivePrioritySelectTaskId(null)
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 transition flex items-center gap-2 cursor-pointer"
                                  >
                                    {renderPriorityFlag(o.value)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Status column */}
                          <div className="col-span-2 relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveStatusSelectTaskId((p) =>
                                  p === task.id ? null : task.id
                                )
                              }}
                              className="status-toggle inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold cursor-pointer transition select-none focus:outline-none items-center gap-1 hover:bg-zinc-150 dark:hover:bg-zinc-800"
                              title="Edit Status"
                            >
                              <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${STATUS_COLORS[task.status]}`}>
                                {STATUS_LABELS[task.status]}
                              </span>
                              <svg className="h-2 w-2 text-zinc-400 ml-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {activeStatusSelectTaskId === task.id && (
                              <div className="status-dropdown absolute right-0 top-7 w-36 rounded-lg shadow-xl py-1 z-50 border theme-border theme-modal" onClick={(e) => e.stopPropagation()}>
                                {TASK_STATUS_OPTIONS.map((o) => (
                                  <button
                                    key={o.value}
                                    type="button"
                                    onClick={async () => {
                                      await handleUpdateStatus(task.id, o.value)
                                      setActiveStatusSelectTaskId(null)
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 transition flex items-center gap-2 cursor-pointer justify-center"
                                  >
                                    <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${STATUS_COLORS[o.value]}`}>
                                      {STATUS_LABELS[o.value]}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subtasks Rows */}
                        {isExpanded &&
                          subs.map((sub) => (
                            <div
                              key={sub.id}
                              className="grid grid-cols-12 gap-3 px-4 py-2 items-center hover:bg-zinc-50/20 dark:hover:bg-zinc-800/10 transition-colors border-b theme-border bg-zinc-50/50 dark:bg-zinc-900/10"
                            >
                              {/* Name column with connector and indent */}
                              <div className="col-span-3 flex items-center gap-2 pl-6 min-w-0">
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-650 font-mono select-none mr-0.5">└─</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onTaskClick(sub.id, project.id)
                                  }}
                                  className="theme-text hover:text-violet-500 text-left truncate cursor-pointer focus:outline-none text-[11px] font-medium"
                                >
                                  {sub.title}
                                </button>
                              </div>

                              {/* Tags column */}
                              <div className="col-span-2 flex gap-1 flex-wrap shrink-0">
                                {sub.tags?.map((t) => (
                                  <span
                                    key={t.id}
                                    className="text-[8px] px-1.5 py-0.5 border rounded-md font-semibold"
                                    style={{
                                      color: t.color,
                                      borderColor: t.color,
                                      backgroundColor: `${t.color}0d`,
                                    }}
                                  >
                                    {t.name}
                                  </span>
                                ))}
                              </div>

                              {/* Assignee column */}
                              <div className="col-span-1 flex items-center justify-start">
                                {sub.assignees && sub.assignees.length > 0 ? (
                                  <div className="flex -space-x-1.5 overflow-hidden">
                                    {sub.assignees.map((assignee, idx) => {
                                      const u = users.find((user) => user.id === assignee.user_id)
                                      const name = u ? u.full_name : 'Unknown'
                                      return (
                                        <AssigneeAvatar
                                          key={assignee.id}
                                          userId={assignee.user_id}
                                          name={name}
                                          index={idx}
                                          size="sm"
                                          className="ring-1 ring-white dark:ring-zinc-900 !h-5 !w-5 !text-[8px]"
                                        />
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] theme-text-muted">—</span>
                                )}
                              </div>

                              {/* Due Date column */}
                              <div className="col-span-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {sub.due_date ? formatDate(sub.due_date) : <span className="theme-text-muted">—</span>}
                              </div>

                              {/* Priority column */}
                              <div className="col-span-2 relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActivePrioritySelectTaskId((p) =>
                                      p === sub.id ? null : sub.id
                                    )
                                  }}
                                  className="priority-toggle flex items-center gap-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 px-1 py-0.5 rounded cursor-pointer transition focus:outline-none"
                                  title="Edit Priority"
                                >
                                  {renderPriorityFlag(sub.priority)}
                                  <svg className="h-2 w-2 text-zinc-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {activePrioritySelectTaskId === sub.id && (
                                  <div className="priority-dropdown absolute right-0 top-7 w-32 rounded-lg shadow-xl py-1 z-50 border theme-border theme-modal" onClick={(e) => e.stopPropagation()}>
                                    {TASK_PRIORITY_OPTIONS.map((o) => (
                                      <button
                                        key={o.value}
                                        type="button"
                                        onClick={async () => {
                                          await handleUpdatePriority(sub.id, o.value)
                                          setActivePrioritySelectTaskId(null)
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 transition flex items-center gap-2 cursor-pointer"
                                      >
                                        {renderPriorityFlag(o.value)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Status column */}
                              <div className="col-span-2 relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveStatusSelectTaskId((p) =>
                                      p === sub.id ? null : sub.id
                                    )
                                  }}
                                  className="status-toggle inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold cursor-pointer transition select-none focus:outline-none items-center gap-1 hover:bg-zinc-150 dark:hover:bg-zinc-800"
                                  title="Edit Status"
                                >
                                  <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[sub.status]}`}>
                                    {STATUS_LABELS[sub.status]}
                                  </span>
                                  <svg className="h-2 w-2 text-zinc-400 ml-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {activeStatusSelectTaskId === sub.id && (
                                  <div className="status-dropdown absolute right-0 top-7 w-36 rounded-lg shadow-xl py-1 z-50 border theme-border theme-modal" onClick={(e) => e.stopPropagation()}>
                                    {TASK_STATUS_OPTIONS.map((o) => (
                                      <button
                                        key={o.value}
                                        type="button"
                                        onClick={async () => {
                                          await handleUpdateStatus(sub.id, o.value)
                                          setActiveStatusSelectTaskId(null)
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-150 dark:hover:bg-zinc-800 transition flex items-center gap-2 cursor-pointer justify-center"
                                      >
                                        <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${STATUS_COLORS[o.value]}`}>
                                          {STATUS_LABELS[o.value]}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </React.Fragment>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Comments Column */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-xs font-bold theme-text uppercase tracking-wider shrink-0">
              Project Comments
            </h3>
            <ProjectCommentsSection projectId={project.id} token={token} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Internal Project Comments Component
interface ProjectCommentsSectionProps {
  projectId: string
  token: string | null
}

function ProjectCommentsSection({ projectId, token }: ProjectCommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')

  const loadComments = useCallback(() => {
    if (!token || !projectId) return
    setLoading(true)
    setError(null)
    getComments(token, projectId)
      .then(setComments)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load comments'))
      .finally(() => setLoading(false))
  }, [token, projectId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !newComment.trim()) return
    setError(null)
    try {
      const added = await addComment(token, projectId, newComment.trim())
      setComments((prev) => [...prev, added])
      setNewComment('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add comment')
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-[350px] border theme-border rounded-xl theme-modal overflow-hidden bg-white dark:bg-zinc-900/60 shadow-inner">
      {/* List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {loading && comments.length === 0 ? (
          <p className="text-[10px] theme-text-muted text-center py-4">Loading comments...</p>
        ) : error ? (
          <p className="text-[10px] text-red-400 text-center py-4">{error}</p>
        ) : comments.length === 0 ? (
          <p className="text-[10px] theme-text-muted text-center py-6">No comments yet. Start the conversation!</p>
        ) : (
          comments.map((c) => {
            const authorName = c.author ? c.author.full_name : 'Unknown Author'
            const init = initials(authorName)
            return (
              <div key={c.id} className="flex gap-2 text-left">
                <div className="h-6 w-6 rounded-full bg-violet-600 text-[10px] text-white flex items-center justify-center font-bold shrink-0">
                  {init}
                </div>
                <div className="flex-1 rounded-lg border theme-border px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/40 text-[11px] min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold theme-text truncate">{authorName}</span>
                    <span className="text-[9px] theme-text-muted ml-2 shrink-0">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="theme-text break-words leading-relaxed whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleAddComment}
        className="border-t theme-border p-2 bg-zinc-50 dark:bg-zinc-800/20 flex gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 rounded-lg border px-3 py-1.5 text-xs theme-border theme-panel theme-text outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 cursor-pointer transition select-none shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  )
}
