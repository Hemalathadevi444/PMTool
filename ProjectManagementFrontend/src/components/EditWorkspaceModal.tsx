import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/http'
import type { Workspace } from '../api/types'

interface EditWorkspaceModalProps {
  open: boolean
  workspace: Workspace | null
  onClose: () => void
  onSubmit: (name: string, description: string) => Promise<void>
}

export function EditWorkspaceModal({
  open,
  workspace,
  onClose,
  onSubmit,
}: EditWorkspaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && workspace) {
      setName(workspace.name)
      setDescription(workspace.description ?? '')
      setError(null)
    }
  }, [open, workspace])

  if (!open || !workspace) return null

  const iconLetter = name.trim() ? name.trim()[0].toUpperCase() : 'W'
  const canSubmit = name.trim().length > 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || loading) return
    setLoading(true)
    setError(null)
    try {
      await onSubmit(name.trim(), description.trim())
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save workspace')
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
        className="theme-modal w-full max-w-[480px] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-workspace-title"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b theme-border shrink-0">
            <div>
              <h2 id="edit-workspace-title" className="text-lg font-semibold theme-text">
                Edit Workspace
              </h2>
              <p className="mt-1 text-xs theme-text-secondary">
                Update the name and description of this workspace.
              </p>
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

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-medium theme-text-secondary">
                Workspace Name <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                <div className="theme-panel flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-semibold theme-text-muted select-none">
                  {iconLetter}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Workspace name"
                  className="theme-input theme-input-accent flex-1 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium theme-text-secondary">
                Description <span className="font-normal theme-text-muted">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this workspace"
                rows={3}
                className="theme-input w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 resize-none"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t theme-border shrink-0">
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
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
