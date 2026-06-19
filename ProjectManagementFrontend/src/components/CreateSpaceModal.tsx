import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/http'

export interface CreateSpaceFormData {
  name: string
  description: string
}

interface CreateSpaceModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateSpaceFormData) => Promise<void>
}

export function CreateSpaceModal({ open, onClose, onSubmit }: CreateSpaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setError(null)
    }
  }, [open])

  if (!open) return null

  const iconLetter = name.trim() ? name.trim()[0].toUpperCase() : 'S'
  const canSubmit = name.trim().length > 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || loading) return
    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create workspace')
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
        className="theme-modal w-full max-w-[520px] rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-space-title"
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <h2 id="create-space-title" className="text-xl font-semibold theme-text">
              Create a Workspace
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed theme-text-secondary">
              A Workspace represents teams, departments, or groups, each with its own Lists,
              workflows, and settings.
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

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5">
          <label className="mb-2 block text-sm font-medium theme-text-secondary">Icon &amp; name</label>
          <div className="flex gap-3">
            <div className="theme-panel flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-semibold theme-text-muted">
              {iconLetter}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing, Engineering, HR"
              className="theme-input theme-input-accent flex-1 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
              autoFocus
              required
            />
          </div>

          <label className="mb-2 mt-5 block text-sm font-medium theme-text-secondary">
            Description <span className="font-normal theme-text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder=""
            className="theme-input w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
          />



          {error && (
            <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
