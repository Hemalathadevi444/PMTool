import { useEffect, useRef, useState, useMemo, type FormEvent } from 'react'
import { ApiError } from '../api/http'
import type { Project, Tag, User, TaskStatus } from '../api/types'
import { TagPicker, type NewTagDraft } from './TagPicker'
import { useAuth } from '../context/AuthContext'
import { TASK_STATUS_OPTIONS } from '../utils/taskHelpers'

const ISSUE_TYPE_OPTIONS = ['Bug', 'New Requirement', 'Existing Requirement']
const CATEGORY_OPTIONS = ['HIS', 'SAP', 'PACS', 'PRISM', 'One AIG']
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical', 'urgent']

export interface EditProjectFormData {
  name: string
  status: TaskStatus
  issue_type: string
  category: string
  priority: string
  owner_id: string
  due_date: string
  description: string
  tag_ids: string[]
}

interface EditProjectModalProps {
  open: boolean
  project: Project | null
  tags: Tag[]
  users: User[]
  onClose: () => void
  onSubmit: (projectId: string, data: EditProjectFormData) => Promise<void>
  onCreateTag?: (name: string, color: string) => Promise<Tag>
}

// Chip Selector component: shows preset options as chips (like tags) + allows custom entry inline
interface ChipSelectorProps {
  options: string[]
  value: string
  onChange: (val: string) => void
  placeholder: string
}

function ChipSelector({ options, value, onChange, placeholder }: ChipSelectorProps) {
  const [customOptions, setCustomOptions] = useState<string[]>([])
  const [editing, setEditing] = useState(false)
  const [customVal, setCustomVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  const allOptions = Array.from(new Set([...options, ...customOptions, ...(value ? [value] : [])]))

  // Clean custom options list of empty strings
  function selectOption(opt: string) {
    onChange(opt)
    setEditing(false)
  }

  function handleAddCustom() {
    const trimmed = customVal.trim()
    if (trimmed) {
      setCustomOptions((prev) => [...prev, trimmed])
      onChange(trimmed)
    }
    setCustomVal('')
    setEditing(false)
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {allOptions.map((opt) => {
        const isSelected = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => selectOption(opt)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer focus:outline-none ${
              isSelected
                ? 'bg-violet-600 border-violet-600 text-white font-semibold shadow-sm'
                : 'theme-panel border theme-border theme-text hover:bg-violet-500/10 hover:theme-text'
            }`}
          >
            {isSelected && (
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {opt}
          </button>
        )
      })}

      {editing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            placeholder={placeholder}
            className="rounded border theme-border px-2 py-1 text-xs theme-input outline-none focus:border-violet-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustom()
              }
              if (e.key === 'Escape') {
                setEditing(false)
                setCustomVal('')
              }
            }}
            onBlur={handleAddCustom}
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="p-1 rounded theme-text hover:bg-violet-500/15"
          >
            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-violet-400 hover:text-violet-500 transition-colors cursor-pointer"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Custom
        </button>
      )}
    </div>
  )
}

// ─── OwnerDropdown ────────────────────────────────────────────────────────────
interface OwnerDropdownProps {
  users: User[]
  value: string
  onChange: (id: string) => void
}

function OwnerDropdown({ users, value, onChange }: OwnerDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = users.find(u => u.id === value)
  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setSearch('')
      }
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function openDropdown() { setOpen(true); setSearch(''); setTimeout(() => inputRef.current?.focus(), 0) }
  function selectUser(id: string) { onChange(id); setOpen(false); setSearch('') }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openDropdown}
        className={`theme-input w-full rounded-lg flex items-center gap-2.5 px-3 py-2.5 text-sm text-left focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 ${!selected ? 'theme-text-muted' : 'theme-text'}`}
      >
        {selected ? (
          <>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-violet-500 text-[10px] font-bold uppercase">
              {selected.full_name.charAt(0)}
            </span>
            <span className="flex-1 truncate font-medium">{selected.full_name}</span>
          </>
        ) : (
          <>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border theme-border text-[10px] theme-text-muted">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <span className="flex-1">Select owner...</span>
          </>
        )}
        <svg className={`h-3.5 w-3.5 shrink-0 theme-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-xl shadow-2xl border theme-border theme-modal overflow-hidden">
          <div className="px-3 py-2 border-b theme-border">
            <div className="flex items-center gap-2 theme-panel rounded-lg px-2.5 py-1.5">
              <svg className="h-3.5 w-3.5 shrink-0 theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="flex-1 bg-transparent outline-none text-xs theme-text placeholder:theme-text-muted" />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="theme-text-muted hover:theme-text transition-colors">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs theme-text-muted text-center">No users match &ldquo;{search}&rdquo;</p>
            ) : (
              filtered.map(u => (
                <button key={u.id} type="button" onClick={() => selectUser(u.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${value === u.id ? 'bg-violet-600 text-white' : 'theme-text hover:bg-violet-500/10 hover:text-violet-500'}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase ${value === u.id ? 'bg-white/20 text-white' : 'bg-violet-600/20 text-violet-500'}`}>
                    {u.full_name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold leading-tight">{u.full_name}</p>
                    <p className={`truncate text-[10px] leading-tight ${value === u.id ? 'text-white/70' : 'theme-text-muted'}`}>{u.email}</p>
                  </div>
                  {value === u.id && (
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EditProjectModal ─────────────────────────────────────────────────────────
export function EditProjectModal({
  open,
  project,
  tags,
  users,
  onClose,
  onSubmit,
  onCreateTag,
}: EditProjectModalProps) {
  const { user: currentUser } = useAuth()

  const [name, setName] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [issueType, setIssueType] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagDraft, setNewTagDraft] = useState<NewTagDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Include currently logged-in user in owner options
  const ownerOptions = useMemo(() => {
    const list = [...users]
    if (currentUser && !list.some(u => u.id === currentUser.id)) {
      list.push(currentUser)
    }
    return list
  }, [users, currentUser])

  // Pre-populate all fields from project on open
  useEffect(() => {
    if (open && project) {
      setName(project.name)
      setStatus(project.status)
      setIssueType(project.issue_type ?? '')
      setCategory(project.category ?? '')
      setPriority(project.priority ?? '')
      setOwnerId(project.owner_id ?? '')
      setDueDate(project.due_date ? project.due_date.split('T')[0] : '')
      setDescription(project.description ?? '')
      setSelectedTagIds(project.tags?.map(t => t.id) ?? [])
      setNewTagDraft(null)
      setError(null)
    }
  }, [open, project])

  if (!open || !project) return null

  const iconLetter = name.trim() ? name.trim()[0].toUpperCase() : 'P'
  const canSubmit = name.trim().length > 0 && issueType.trim().length > 0 && category.trim().length > 0 && priority.trim().length > 0 && ownerId.length > 0 && dueDate.trim().length > 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || loading || !project) return
    setLoading(true)
    setError(null)
    try {
      const tagIds = [...selectedTagIds]
      if (newTagDraft && newTagDraft.name.trim() && onCreateTag) {
        const newTag = await onCreateTag(newTagDraft.name.trim(), newTagDraft.color)
        tagIds.push(newTag.id)
      }
      await onSubmit(project.id, {
        name: name.trim(),
        status,
        issue_type: issueType.trim(),
        category: category.trim(),
        priority: priority.trim(),
        owner_id: ownerId,
        due_date: dueDate,
        description: description.trim(),
        tag_ids: tagIds,
      })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save')
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
        className="theme-modal w-full max-w-[560px] rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-project-title"
      >
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b theme-border shrink-0">
            <div>
              <h2 id="edit-project-title" className="text-xl font-semibold theme-text">Edit Project</h2>
              <p className="mt-1 text-sm theme-text-secondary">Update the project details below.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded p-1 theme-text-muted theme-hover" aria-label="Close">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium theme-text-secondary">
                Project Name <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                <div className="theme-panel flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-semibold theme-text-muted select-none">
                  {iconLetter}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="theme-input theme-input-accent flex-1 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="edit-project-status" className="mb-1.5 block text-sm font-medium theme-text-secondary">
                Status <span className="text-red-400">*</span>
              </label>
              <select
                id="edit-project-status"
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="theme-input w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                required
              >
                {TASK_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Issue Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium theme-text-secondary">
                Issue Type <span className="text-red-400">*</span>
              </label>
              <ChipSelector
                options={ISSUE_TYPE_OPTIONS}
                value={issueType}
                onChange={setIssueType}
                placeholder="Custom issue type..."
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-sm font-medium theme-text-secondary">
                Category <span className="text-red-400">*</span>
              </label>
              <ChipSelector
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={setCategory}
                placeholder="Custom category..."
              />
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1.5 block text-sm font-medium theme-text-secondary">
                Priority <span className="text-red-400">*</span>
              </label>
              <ChipSelector
                options={PRIORITY_OPTIONS}
                value={priority}
                onChange={setPriority}
                placeholder="Custom priority..."
              />
            </div>

            {/* Owner */}
            <div>
              <label className="mb-1.5 block text-sm font-medium theme-text-secondary">
                Owner <span className="text-red-400">*</span>
              </label>
              <OwnerDropdown
                users={ownerOptions}
                value={ownerId}
                onChange={setOwnerId}
              />
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="edit-due-date" className="mb-1.5 block text-sm font-medium theme-text-secondary">
                Due Date <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="edit-due-date"
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="theme-input w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium theme-text-secondary">
                Description <span className="font-normal theme-text-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of this project"
                className="theme-input w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1.5 block text-sm font-medium theme-text-secondary">
                Tags <span className="font-normal theme-text-muted">(optional)</span>
              </label>
              <TagPicker
                tags={tags}
                selectedTagIds={selectedTagIds}
                onSelect={setSelectedTagIds}
                newTagDraft={newTagDraft}
                onChangeNewTagDraft={setNewTagDraft}
              />
            </div>

            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t theme-border shrink-0">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium theme-text-secondary hover:theme-text">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
