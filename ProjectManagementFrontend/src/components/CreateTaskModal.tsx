import { useEffect, useRef, useState, useMemo, type FormEvent } from 'react'
import { getUsers } from '../api/client'
import { ApiError } from '../api/http'
import type { Tag, TaskPriority, TaskStatus, User, Workspace, Project } from '../api/types'
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '../utils/taskHelpers'

export interface CreateTaskFormData {
  title: string
  description: string
  project_id: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  assignee_ids: string[]
  tag_ids: string[]
}

interface CreateTaskModalProps {
  open: boolean
  projectId: string | null
  workspaces: Workspace[]
  projects: Project[]
  tags?: Tag[]
  token: string | null
  modalTitle?: string
  modalDescription?: string
  submitLabel?: string
  validationError?: string | null
  onClose: () => void
  onSubmit: (data: CreateTaskFormData) => Promise<void>
  isSubtask?: boolean
}

const selectClass =
  'theme-input w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30'

export function CreateTaskModal({
  open,
  projectId,
  workspaces,
  projects,
  tags = [],
  token,
  modalTitle = 'Create a Task',
  modalDescription,
  submitLabel = 'Create Task',
  validationError,
  onClose,
  onSubmit,
  isSubtask = false,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const assigneeRef = useRef<HTMLDivElement>(null)

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')

  // Filter projects by workspace
  const workspaceProjects = useMemo(() => {
    return projects.filter((p) => p.workspace_id === selectedWorkspaceId)
  }, [projects, selectedWorkspaceId])

  const selectedProject = useMemo(() => {
    const targetProjId = isSubtask ? (projectId ?? '') : selectedProjectId
    return projects.find((p) => p.id === targetProjId)
  }, [projects, isSubtask, projectId, selectedProjectId])

  const handleWorkspaceChange = (wsId: string) => {
    setSelectedWorkspaceId(wsId)
    const firstProj = projects.find((p) => p.workspace_id === wsId)
    setSelectedProjectId(firstProj?.id ?? '')
  }

  useEffect(() => {
    if (!open || !token) return

    setTitle('')
    setDescription('')
    setStatus('todo')
    setPriority('medium')
    setDueDate('')
    setSelectedTagIds([])
    setAssigneeIds([])
    setError(null)
    setAssigneeOpen(false)

    const initialProject = projects.find((p) => p.id === projectId)
    const initialWorkspaceId = initialProject?.workspace_id ?? workspaces[0]?.id ?? ''
    setSelectedWorkspaceId(initialWorkspaceId)
    setSelectedProjectId(projectId ?? projects.find((p) => p.workspace_id === initialWorkspaceId)?.id ?? '')

    setUsersLoading(true)
    getUsers(token)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false))
  }, [open, token, projectId, projects, workspaces])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setAssigneeOpen(false)
      }
    }
    if (assigneeOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [assigneeOpen])

  if (!open) return null

  const canSubmit = title.trim().length > 0
  const selectedUsers = users.filter((u) => assigneeIds.includes(u.id))

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId)
      }
      setError(null)
      return [...prev, userId]
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const targetProjId = isSubtask ? (projectId ?? '') : selectedProjectId
    if (!canSubmit || loading || !targetProjId) return
    
    if (dueDate && selectedProject?.due_date) {
      const taskDate = new Date(dueDate)
      const projectDate = new Date(selectedProject.due_date)
      taskDate.setHours(0, 0, 0, 0)
      projectDate.setHours(0, 0, 0, 0)
      if (taskDate > projectDate) {
        setError(`Task due date cannot exceed project due date (${projectDate.toLocaleDateString()})`)
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        project_id: targetProjId,
        status,
        priority,
        due_date: dueDate,
        assignee_ids: assigneeIds,
        tag_ids: selectedTagIds,
      })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="theme-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="theme-modal max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <h2 id="create-task-title" className="text-xl font-semibold theme-text">
              {modalTitle}
            </h2>
            {modalDescription && (
              <p className="mt-2 text-sm theme-text-secondary">
                {modalDescription}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 theme-text-muted theme-hover"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 pt-5">
          {!isSubtask && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="task-workspace" className="mb-2 block text-sm font-medium theme-text-secondary">
                  Workspace
                </label>
                <select
                  id="task-workspace"
                  value={selectedWorkspaceId}
                  onChange={(e) => handleWorkspaceChange(e.target.value)}
                  className={selectClass}
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="task-project" className="mb-2 block text-sm font-medium theme-text-secondary">
                  Project
                </label>
                <select
                  id="task-project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="" disabled>Select project</option>
                  {workspaceProjects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="task-title" className="mb-2 block text-sm font-medium theme-text-secondary">
              Title
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Production Server onboarding to SIEM"
              className="theme-input theme-input-accent w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
              autoFocus
              required
            />
          </div>

          <div>
            <label htmlFor="task-desc" className="mb-2 block text-sm font-medium theme-text-secondary">
              Description <span className="font-normal theme-text-muted">(optional)</span>
            </label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Task details…"
              className="theme-input w-full resize-none rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-2 block text-sm font-medium theme-text-secondary">
                Tags <span className="font-normal theme-text-muted">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-1 border theme-border rounded-lg">
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setSelectedTagIds(prev =>
                          prev.includes(tag.id)
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        )
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer select-none"
                      style={{
                        color: tag.color,
                        borderColor: tag.color,
                        backgroundColor: isSelected ? `${tag.color}18` : 'transparent',
                        boxShadow: isSelected ? `0 0 0 2px ${tag.color}40` : 'none',
                      }}
                    >
                      {isSelected && (
                        <span className="text-[10px]">✓</span>
                      )}
                      {tag.name}
                    </button>
                  )
                })}
                {tags.length === 0 && (
                  <span className="text-xs theme-text-muted p-1">No tags available</span>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="task-status" className="mb-2 block text-sm font-medium theme-text-secondary">
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className={selectClass}
              >
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority" className="mb-2 block text-sm font-medium theme-text-secondary">
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={selectClass}
              >
                {TASK_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="task-due" className="mb-2 block text-sm font-medium theme-text-secondary">
              Due date <span className="font-normal theme-text-muted">(optional)</span>
            </label>
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              max={selectedProject?.due_date ? selectedProject.due_date.split('T')[0] : undefined}
              className={selectClass}
            />
          </div>

          <div ref={assigneeRef} className="relative">
            <label className="mb-2 block text-sm font-medium theme-text-secondary">
              Assignees
            </label>
            <button
              type="button"
              onClick={() => setAssigneeOpen((v) => !v)}
              className={`theme-input flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 ${
                assigneeOpen ? 'theme-input-accent' : ''
              }`}
            >
              <span className={selectedUsers.length ? 'theme-text' : 'theme-text-muted'}>
                {usersLoading
                  ? 'Loading users…'
                  : selectedUsers.length
                    ? selectedUsers.map((u) => u.full_name).join(', ')
                    : 'Select assignees'}
              </span>
              <span className="theme-text-muted">▾</span>
            </button>

            {assigneeOpen && (
              <div className="theme-modal absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg py-1 shadow-xl">
                {users.length === 0 ? (
                  <p className="px-3 py-2 text-sm theme-text-muted">No users found</p>
                ) : (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm theme-text-secondary theme-hover"
                    >
                      <input
                        type="checkbox"
                        checked={assigneeIds.includes(user.id)}
                        onChange={() => toggleAssignee(user.id)}
                        className="rounded border-zinc-600"
                      />
                      <span className="flex-1">{user.full_name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {(validationError || error) && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {validationError ?? error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium theme-text-secondary hover:theme-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
