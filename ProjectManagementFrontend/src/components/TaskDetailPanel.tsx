import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { getTags, getTask, getUsers, replaceTaskAssignees, updateTask, getTaskComments, addTaskComment, createTag, getProject } from '../api/client'
import { ApiError } from '../api/http'
import type { Tag, Task, TaskPriority, TaskStatus, User, Comment, Project } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { AssigneeAvatar } from './AssigneeAvatar'
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  priorityFlag,
  initials,
} from '../utils/taskHelpers'

interface TaskDetailPanelProps {
  taskId: string | null
  workspaceName: string
  projectName: string
  onClose: () => void
}

function formatCreatedDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const TAG_COLORS = [
  '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

export function TaskDetailPanel({
  taskId,
  workspaceName,
  projectName,
  onClose,
}: TaskDetailPanelProps) {
  const { token } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [titleEditing, setTitleEditing] = useState(false)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [dueDate, setDueDate] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [showNewTagForm, setShowNewTagForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const assigneeRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [commentsWidth, setCommentsWidth] = useState(360)
  const isResizing = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const newWidth = rect.right - e.clientX
    if (newWidth >= 240 && newWidth <= 600) {
      setCommentsWidth(newWidth)
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    if (!token || !taskId) {
      setTask(null)
      setProject(null)
      setTitle('')
      setDescription('')
      setStatus('todo')
      setPriority('medium')
      setSelectedTagIds([])
      setDueDate('')
      setAssigneeIds([])
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setAssigneeOpen(false)
    setTitleEditing(false)

    getTask(token, taskId)
      .then((taskData) => {
        if (cancelled) return
        setTask(taskData)
        setTitle(taskData.title)
        setDescription(taskData.description ?? '')
        setStatus(taskData.status)
        setPriority(taskData.priority)
        setSelectedTagIds(taskData.tags?.map((t) => t.id) ?? [])
        setDueDate(taskData.due_date ?? '')
        setAssigneeIds(taskData.assignees.map((a) => a.user_id))

        getProject(token, taskData.project_id)
          .then((projData) => {
            if (!cancelled) setProject(projData)
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (!cancelled) {
          setTask(null)
          setError(err instanceof ApiError ? err.message : 'Failed to load task')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    setUsersLoading(true)
    getUsers(token)
      .then((userList) => {
        if (!cancelled) setUsers(userList)
      })
      .catch(() => {
        if (!cancelled) setUsers([])
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false)
      })

    getTags(token)
      .then((tagList) => {
        if (!cancelled) setTags(tagList)
      })
      .catch(() => {
        if (!cancelled) setTags([])
      })

    return () => {
      cancelled = true
    }
  }, [taskId, token])

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

  useEffect(() => {
    if (titleEditing) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [titleEditing])

  function handleClose() {
    onClose()
  }

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId)
      }
      setError(null)
      return [...prev, userId]
    })
  }

  async function handleCreateTag() {
    if (!newTagName.trim() || !token) return
    try {
      const created = await createTag(token, {
        name: newTagName.trim(),
        color: newTagColor,
      })
      setTags((prev) => [...prev, created])
      setSelectedTagIds((prev) => [...prev, created.id])
      setShowNewTagForm(false)
      setNewTagName('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create tag')
    }
  }

  async function handleSave() {
    if (!token || !taskId) return
    if (dueDate && project?.due_date) {
      const taskDate = new Date(dueDate)
      const projectDate = new Date(project.due_date)
      taskDate.setHours(0, 0, 0, 0)
      projectDate.setHours(0, 0, 0, 0)
      if (taskDate > projectDate) {
        setError(`Task due date cannot exceed project due date (${projectDate.toLocaleDateString()})`)
        return
      }
    }
    setSaving(true)
    setError(null)
    try {
      await updateTask(token, taskId, {
        title,
        description: description || null,
        status,
        priority,
        due_date: dueDate || null,
        tag_ids: selectedTagIds,
      })
      await replaceTaskAssignees(token, taskId, assigneeIds)
      handleClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  if (!taskId) return null

  const selectedUsers = users.filter((u) => assigneeIds.includes(u.id))

  const selectClass =
    'rounded-md border px-2 py-1 text-sm theme-border theme-panel theme-text outline-none focus:border-violet-500'

  return (
    <div
      className="theme-overlay fixed inset-0 z-50 flex items-start justify-center p-4 pt-8"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="theme-modal flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        <header className="flex items-center gap-3 border-b px-5 py-3 theme-border">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs theme-text-muted">
            <span className="truncate">{workspaceName}</span>
            <span>/</span>
            <span className="truncate theme-text-secondary">{projectName}</span>
            <span>/</span>
            <span className="theme-text-secondary">List</span>
          </div>
          {task && (
            <span className="shrink-0 text-xs theme-text-muted">
              Created {formatCreatedDate(task.created_at)}
            </span>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1.5 theme-text-muted theme-hover"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {loading ? (
            <div className="p-6 flex-1">
              <p className="text-sm theme-text-muted">Loading task...</p>
            </div>
          ) : error && !task ? (
            <div className="p-6 flex-1">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : task ? (
            <div ref={containerRef} className="flex flex-1 overflow-hidden min-h-0 w-full">
              {/* Left column: Task details form */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="mb-4 flex items-center gap-3 text-xs theme-text-muted">
                  <span className="flex items-center gap-1.5 rounded-md border px-2 py-1 theme-border theme-text-secondary">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    Task
                  </span>
                  <span>#{task.id.slice(0, 8)}</span>
                </div>

                <div className="mb-4 flex max-w-full items-center gap-2">
                  {titleEditing ? (
                    <input
                      ref={titleInputRef}
                      id="task-detail-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => setTitleEditing(false)}
                      className="min-w-0 max-w-full rounded-md border bg-transparent px-2 py-1 text-2xl font-semibold leading-tight theme-border theme-text outline-none focus:border-violet-500"
                      style={{ width: `${Math.max(title.length, 8)}ch` }}
                    />
                  ) : (
                    <h1 id="task-detail-title" className="max-w-full truncate text-2xl font-semibold leading-tight theme-text">
                      {title}
                    </h1>
                  )}
                  <button
                    type="button"
                    onClick={() => setTitleEditing((editing) => !editing)}
                    className="shrink-0 rounded-md border p-1.5 theme-border theme-text-secondary theme-hover"
                    aria-label="Edit task name"
                    title="Edit task name"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-4">
                  <DetailField label="Status">
                    <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={selectClass}>
                      {TASK_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className={`ml-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </DetailField>

                  <DetailField label="Assignees">
                    <div ref={assigneeRef} className="relative min-w-[180px] flex-1">
                      <button
                        type="button"
                        onClick={() => setAssigneeOpen((v) => !v)}
                        className={`theme-input flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm outline-none focus:border-violet-500 ${
                          assigneeOpen ? 'theme-input-accent' : ''
                        }`}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-1 truncate">
                          {selectedUsers.length > 0 ? (
                            <>
                              <span className="flex -space-x-1">
                                {selectedUsers.slice(0, 3).map((assignee, index) => (
                                  <AssigneeAvatar
                                    key={assignee.id}
                                    userId={assignee.id}
                                    name={assignee.full_name}
                                    index={index}
                                    size="md"
                                  />
                                ))}
                              </span>
                              {selectedUsers.length > 3 && (
                                <span className="text-xs theme-text-muted">+{selectedUsers.length - 3}</span>
                              )}
                            </>
                          ) : (
                            <span className="theme-text-muted">
                              {usersLoading ? 'Loading…' : 'Select assignees'}
                            </span>
                          )}
                        </span>
                        <span className="ml-1 theme-text-muted">▾</span>
                      </button>

                      {assigneeOpen && (
                        <div className="theme-modal absolute z-10 mt-1 max-h-48 w-full min-w-[240px] overflow-y-auto rounded-lg py-1 shadow-xl">
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
                  </DetailField>

                  <DetailField label="Dates">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      max={project?.due_date ? project.due_date.split('T')[0] : undefined}
                      className={selectClass}
                    />
                  </DetailField>

                  <DetailField label="Priority">
                    <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={selectClass}>
                      {TASK_PRIORITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className={`ml-2 text-sm ${PRIORITY_COLORS[priority]}`}>
                      {priorityFlag(priority)} {PRIORITY_LABELS[priority]}
                    </span>
                  </DetailField>
                </div>

                <div className="mb-6 flex items-start gap-3">
                  <div className="flex w-28 shrink-0 items-center gap-1.5 text-xs theme-text-muted mt-1">
                    <span>Tags</span>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-1.5 items-center">
                    {tags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            setSelectedTagIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== tag.id)
                                : [...prev, tag.id]
                            )
                          }}
                          className="inline-flex items-center gap-1 rounded border px-2.5 py-0.5 text-[10px] font-semibold transition-all cursor-pointer select-none"
                          style={{
                            color: tag.color,
                            borderColor: tag.color,
                            backgroundColor: isSelected ? `${tag.color}18` : 'transparent',
                            boxShadow: isSelected ? `0 0 0 2px ${tag.color}40` : 'none',
                          }}
                        >
                          {isSelected && <span>✓</span>}
                          {tag.name}
                        </button>
                      )
                    })}

                    {showNewTagForm ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md border theme-border p-1 bg-zinc-50 dark:bg-zinc-800/40">
                        <input
                          type="text"
                          placeholder="Tag name"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="w-20 bg-transparent px-1.5 py-0.5 text-[10px] theme-text outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleCreateTag()
                            }
                            if (e.key === 'Escape') {
                              setShowNewTagForm(false)
                            }
                          }}
                        />
                        <div className="flex gap-1">
                          {TAG_COLORS.slice(0, 5).map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewTagColor(color)}
                              className={`h-3 w-3 rounded-full transition-transform cursor-pointer ${newTagColor === color ? 'scale-125 ring-1 ring-violet-500' : ''}`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleCreateTag}
                          className="text-emerald-500 hover:text-emerald-600 font-bold text-xs px-1 cursor-pointer"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewTagForm(false)}
                          className="text-red-500 hover:text-red-600 font-bold text-xs px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewTagForm(true)
                          setNewTagName('')
                          setNewTagColor(TAG_COLORS[0])
                        }}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-zinc-400 hover:border-violet-500 hover:text-violet-500 text-zinc-400 transition cursor-pointer"
                        title="Create new tag"
                      >
                        +
                      </button>
                    )}

                    {tags.length === 0 && !showNewTagForm && (
                      <span className="text-[11px] theme-text-muted">No tags available</span>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider theme-text-muted">Description</p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Add description"
                    className="w-full resize-none rounded-lg border px-3 py-2 text-sm theme-border theme-panel theme-text outline-none focus:border-violet-500"
                  />
                </div>

                {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>

              {/* Drag handle / separator line */}
              <div
                className="w-1.5 hover:w-2 bg-transparent hover:bg-violet-500/50 cursor-col-resize select-none transition-all duration-150 shrink-0 border-l theme-border relative"
                onMouseDown={handleMouseDown}
                title="Drag to resize comments section"
              />

              {/* Right column: Comments section */}
              <div
                style={{ width: `${commentsWidth}px` }}
                className="shrink-0 flex flex-col overflow-hidden bg-zinc-50/30 dark:bg-zinc-900/10"
              >
                <TaskCommentsSection taskId={task.id} token={token} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex w-28 shrink-0 items-center gap-1.5 text-xs theme-text-muted">
        <span>{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">{children}</div>
    </div>
  )
}

// Inline Task Comments Section Component
interface TaskCommentsSectionProps {
  taskId: string
  token: string | null
}

function TaskCommentsSection({ taskId, token }: TaskCommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')

  const loadComments = useCallback(() => {
    if (!token || !taskId) return
    setLoading(true)
    setError(null)
    getTaskComments(token, taskId)
      .then(setComments)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load comments'))
      .finally(() => setLoading(false))
  }, [token, taskId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !newComment.trim()) return
    setError(null)
    try {
      const added = await addTaskComment(token, taskId, newComment.trim())
      setComments((prev) => [...prev, added])
      setNewComment('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add comment')
    }
  }

  const formatCommentDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <div className="px-4 py-3.5 border-b theme-border shrink-0 bg-zinc-50/50 dark:bg-zinc-800/10">
        <h3 className="text-xs font-bold theme-text uppercase tracking-wider">
          Comments
        </h3>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
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
              <div key={c.id} className="flex gap-2.5 text-left">
                <div className="h-6 w-6 rounded-full bg-violet-600 text-[10px] text-white flex items-center justify-center font-bold shrink-0">
                  {init}
                </div>
                <div className="flex-1 rounded-lg border theme-border px-3 py-2 bg-zinc-50 dark:bg-zinc-800/40 text-[11px] min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold theme-text truncate">{authorName}</span>
                    <span className="text-[9px] theme-text-muted ml-2 shrink-0">{formatCommentDate(c.created_at)}</span>
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
        className="border-t theme-border p-3 bg-zinc-50/50 dark:bg-zinc-800/10 flex gap-2 shrink-0"
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
          className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg disabled:opacity-50 cursor-pointer transition select-none shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  )
}
