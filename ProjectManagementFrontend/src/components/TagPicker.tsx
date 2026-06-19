import { useRef, useEffect } from 'react'
import type { Tag } from '../api/types'

export interface NewTagDraft {
  name: string
  color: string
}

interface TagPickerProps {
  tags: Tag[]
  selectedTagIds: string[]
  onSelect: (tagIds: string[]) => void
  newTagDraft: NewTagDraft | null
  onChangeNewTagDraft: (draft: NewTagDraft | null) => void
}

const TAG_COLORS = [
  '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

export function TagPicker({
  tags,
  selectedTagIds = [],
  onSelect,
  newTagDraft,
  onChangeNewTagDraft,
}: TagPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (newTagDraft !== null && inputRef.current) {
      inputRef.current.focus()
    }
  }, [newTagDraft !== null])

  function openCreate() {
    onChangeNewTagDraft({
      name: '',
      color: TAG_COLORS[0],
    })
  }

  function cancelCreate() {
    onChangeNewTagDraft(null)
  }

  return (
    <div className="space-y-2">
      {/* Tag chips row */}
      <div className="flex flex-wrap gap-2 items-center">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id) && !newTagDraft
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                const nextIds = isSelected
                  ? selectedTagIds.filter((id) => id !== tag.id)
                  : [...selectedTagIds, tag.id]
                onSelect(nextIds)
                onChangeNewTagDraft(null) // deselect draft tag if they pick an existing one
              }}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 focus:outline-none cursor-pointer"
              style={{
                color: tag.color,
                borderColor: tag.color,
                backgroundColor: isSelected ? `${tag.color}18` : 'transparent',
                boxShadow: isSelected ? `0 0 0 2px ${tag.color}40` : 'none',
              }}
              title={isSelected ? 'Click to deselect' : tag.name}
            >
              {isSelected && (
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {tag.name}
            </button>
          )
        })}

        {/* + Add tag button */}
        {newTagDraft === null && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 dark:border-zinc-600 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:border-violet-400 hover:text-violet-500 transition-colors cursor-pointer"
            title="Add new tag"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New tag
          </button>
        )}

        {tags.length === 0 && newTagDraft === null && (
          <span className="text-xs theme-text-muted">No tags available</span>
        )}
      </div>

      {/* Inline create form */}
      {newTagDraft !== null && (
        <div className="rounded-lg border theme-border bg-zinc-50 dark:bg-zinc-800/60 p-3 space-y-2.5">
          {/* Name input */}
          <input
            ref={inputRef}
            type="text"
            value={newTagDraft.name}
            onChange={(e) => onChangeNewTagDraft({ ...newTagDraft, name: e.target.value })}
            placeholder="Tag name…"
            className="w-full rounded-md px-2.5 py-1.5 text-sm theme-input outline-none focus:ring-2 focus:ring-violet-500/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault() // prevent submitting parent form early
              }
              if (e.key === 'Escape') cancelCreate()
            }}
          />

          {/* Color swatches */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-muted mr-0.5">Color</span>
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChangeNewTagDraft({ ...newTagDraft, color: c })}
                className="h-5 w-5 rounded-full transition-transform cursor-pointer"
                style={{
                  backgroundColor: c,
                  outline: c === newTagDraft.color ? `3px solid ${c}` : 'none',
                  outlineOffset: '2px',
                  transform: c === newTagDraft.color ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
            {/* Preview */}
            {newTagDraft.name.trim() && (
              <span
                className="ml-2 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  color: newTagDraft.color,
                  borderColor: newTagDraft.color,
                  backgroundColor: `${newTagDraft.color}18`,
                }}
              >
                {newTagDraft.name.trim()}
              </span>
            )}
          </div>

          {/* Actions - Cancel only, NO Create button! */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelCreate}
              className="rounded-md border theme-border px-3 py-1 text-xs theme-text-secondary hover:theme-text transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
