import { useState } from 'react'
import { createTag, deleteTag, updateTag } from '../api/client'
import { ApiError } from '../api/http'
import type { Tag } from '../api/types'
import { useAuth } from '../context/AuthContext'

const TAG_COLORS = [
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#64748b',
]

interface TagManagementPanelProps {
  tags: Tag[]
  loading?: boolean
  onRefresh: () => Promise<void>
}

export function TagManagementPanel({ tags, loading, onRefresh }: TagManagementPanelProps) {
  const { token } = useAuth()
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startCreate() {
    setEditingTag(null)
    setName('')
    setColor(TAG_COLORS[0])
    setError(null)
  }

  function startEdit(tag: Tag) {
    setEditingTag(tag)
    setName(tag.name)
    setColor(tag.color)
    setError(null)
  }

  async function handleSave() {
    if (!token || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editingTag) {
        await updateTag(token, editingTag.id, { name: name.trim(), color })
      } else {
        await createTag(token, { name: name.trim(), color })
      }
      await onRefresh()
      startCreate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save tag')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(tag: Tag) {
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      await deleteTag(token, tag.id)
      if (editingTag?.id === tag.id) startCreate()
      await onRefresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete tag')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden theme-bg">
      <header className="border-b px-6 py-4 theme-border theme-panel">
        <h1 className="text-xl font-semibold theme-text">Tags</h1>
        <p className="mt-1 text-sm theme-text-secondary">
          Global tags shared across all tasks. Assign them when creating or editing a task.
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-y-auto border-r p-4 theme-border">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider theme-text-muted">All tags</p>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-md px-2 py-1 text-xs font-medium text-violet-500 hover:bg-violet-500/10"
            >
              + New
            </button>
          </div>

          {loading ? (
            <p className="text-sm theme-text-muted">Loading tags…</p>
          ) : tags.length === 0 ? (
            <p className="text-sm theme-text-muted">No tags yet. Create one on the right.</p>
          ) : (
            <ul className="space-y-1">
              {tags.map((tag) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    onClick={() => startEdit(tag)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm theme-hover ${
                      editingTag?.id === tag.id ? 'bg-[var(--color-dark-hover)] theme-text' : 'theme-text-secondary'
                    }`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="truncate">{tag.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="mb-4 text-lg font-medium theme-text">
            {editingTag ? 'Edit tag' : 'Create tag'}
          </h2>

          <div className="max-w-md space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium theme-text-secondary">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bug, Feature, Urgent"
                className="theme-input theme-input-accent w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium theme-text-secondary">Color</label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      color === c ? 'border-white ring-2 ring-violet-500' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!name.trim() || saving}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingTag ? 'Save changes' : 'Create tag'}
              </button>
              {editingTag && (
                <button
                  type="button"
                  onClick={() => void handleDelete(editingTag)}
                  disabled={saving}
                  className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
