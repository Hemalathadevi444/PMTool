import { useEffect, useRef, useState } from 'react'
import { searchProjects, searchTasks } from '../api/client'
import { useAppShell } from '../context/AppShellContext'
import { useAuth } from '../context/AuthContext'
import type { Project, Task, Workspace } from '../api/types'

interface SearchResult {
  type: 'workspace' | 'project' | 'task'
  id: string
  label: string
  subtitle?: string
  projectId?: string
}

function filterWorkspaces(workspaces: Workspace[], q: string): Workspace[] {
  const lower = q.toLowerCase()
  return workspaces.filter(
    (ws) =>
      ws.name.toLowerCase().includes(lower) ||
      (ws.description?.toLowerCase().includes(lower) ?? false),
  )
}

export function GlobalSearchBar() {
  const { token } = useAuth()
  const {
    workspaces,
    projects,
    selectWorkspace,
    selectProject,
    openTaskDetail,
    searchQuery,
    setSearchQuery,
  } = useAppShell()
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (!searchQuery.trim() || !token) {
      setResults([])
      return
    }

    const q = searchQuery.trim()
    let cancelled = false
    setLoading(true)

    async function search() {
      try {
        const [matchedProjects, matchedTasks] = await Promise.all([
          searchProjects(token!, q),
          searchTasks(token!, q),
        ])
        if (cancelled) return

        const matchedWorkspaces = filterWorkspaces(workspaces, q)
        const items: SearchResult[] = [
          ...matchedWorkspaces.map((ws) => ({
            type: 'workspace' as const,
            id: ws.id,
            label: ws.name,
            subtitle: 'Workspace',
          })),
          ...matchedProjects.map((p: Project) => ({
            type: 'project' as const,
            id: p.id,
            label: p.name,
            subtitle: workspaces.find((ws) => ws.id === p.workspace_id)?.name ?? 'Project',
          })),
          ...matchedTasks.map((t: Task) => {
            const project = projects.find((p) => p.id === t.project_id)
            const parentText = t.parent_task_id ? 'Subtask' : 'Task'
            return {
              type: 'task' as const,
              id: t.id,
              label: t.title,
              subtitle: `${project ? project.name : 'Unknown Project'} • ${parentText}`,
              projectId: t.project_id,
            }
          }),
        ]
        setResults(items)
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timer = setTimeout(search, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery, token, workspaces, projects])

  function handleSelect(result: SearchResult) {
    if (result.type === 'workspace') {
      selectWorkspace(result.id)
    } else if (result.type === 'project') {
      selectProject(result.id)
    } else if (result.type === 'task' && result.projectId) {
      openTaskDetail(result.id, result.projectId)
    }
    setSearchQuery('')
    setResults([])
    setOpen(false)
  }

  const typeIcon = {
    workspace: '🏢',
    project: '📋',
    task: '✓',
  }

  return (
    <div ref={ref} className="relative mx-4 flex-1 max-w-xl">
      <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 theme-border theme-bg">
        <svg className="h-4 w-4 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search"
          className="flex-1 bg-transparent text-sm theme-text outline-none placeholder:theme-text-muted"
        />
      </div>

      {open && searchQuery.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-panel)] py-1 shadow-xl">
          {loading ? (
            <p className="px-3 py-2 text-xs text-zinc-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">No results for &ldquo;{searchQuery}&rdquo;</p>
          ) : (
            results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                onClick={() => handleSelect(result)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--color-dark-hover)]"
              >
                <span className="text-sm">{typeIcon[result.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-200">{result.label}</p>
                  {result.subtitle && (
                    <p className="truncate text-xs text-zinc-500">{result.subtitle}</p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-600">
                  {result.type}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
