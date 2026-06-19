import { useEffect, useRef, useState } from 'react'
import type { Project, Task, Workspace } from '../api/types'
import { useAppShell } from '../context/AppShellContext'

interface WorkspaceNavDropdownProps {
  workspaces: Workspace[]
  projects: Project[]
  tasksByProject: Record<string, Task[]>
  selectedWorkspaceId: string | null
  selectedProjectId: string | null
  onSelectProject: (projectId: string) => void
}

function spaceInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? 'S'
}

export function WorkspaceNavDropdown({
  workspaces,
  projects,
  tasksByProject,
  selectedWorkspaceId,
  selectedProjectId,
  onSelectProject,
}: WorkspaceNavDropdownProps) {
  const { openTaskDetail } = useAppShell()
  const [open, setOpen] = useState(false)
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(() => new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => new Set())
  const ref = useRef<HTMLDivElement>(null)

  const selectedWorkspace = workspaces.find((ws) => ws.id === selectedWorkspaceId)
  const label = selectedWorkspace?.name ?? workspaces[0]?.name ?? 'Workspace'

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
    if (open && selectedWorkspaceId) {
      setExpandedWorkspaces((prev) => new Set(prev).add(selectedWorkspaceId))
    }
    if (open && selectedProjectId) {
      setExpandedProjects((prev) => new Set(prev).add(selectedProjectId))
    }
  }, [open, selectedWorkspaceId, selectedProjectId])

  function toggleWorkspace(wsId: string) {
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev)
      if (next.has(wsId)) next.delete(wsId)
      else next.add(wsId)
      return next
    })
  }

  function toggleProject(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  function handleSelectProject(projectId: string) {
    onSelectProject(projectId)
    setOpen(false)
  }

  function handleSelectTask(taskId: string, projectId: string) {
    openTaskDetail(taskId, projectId)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded px-2 py-1 text-sm text-zinc-300 hover:bg-[var(--color-dark-hover)]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {label}
        <span className={`text-zinc-600 transition ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] min-w-[280px] overflow-y-auto rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-panel)] py-1 shadow-xl">
          {workspaces.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">No workspaces</p>
          ) : (
            workspaces.map((ws) => {
              const wsProjects = projects.filter((p) => p.workspace_id === ws.id)
              const wsExpanded = expandedWorkspaces.has(ws.id)
              return (
                <div key={ws.id}>
                  <button
                    type="button"
                    onClick={() => toggleWorkspace(ws.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-dark-hover)]"
                  >
                    <span className={`w-3 text-[10px] text-zinc-500 ${wsExpanded ? '' : '-rotate-90'}`}>▾</span>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-teal-700 text-[10px] font-bold text-white">
                      {spaceInitial(ws.name)}
                    </span>
                    <span className="truncate font-medium text-zinc-200">{ws.name}</span>
                    <span className="ml-auto text-[10px] text-zinc-600">{wsProjects.length}</span>
                  </button>

                  {wsExpanded &&
                    wsProjects.map((project) => {
                      const projectTasks = tasksByProject[project.id] ?? []
                      const projectExpanded = expandedProjects.has(project.id)
                      const isSelected = selectedProjectId === project.id
                      return (
                        <div key={project.id}>
                          <div className="flex items-center pl-6 pr-2">
                            <button
                              type="button"
                              onClick={() => toggleProject(project.id)}
                              className="flex h-7 w-5 shrink-0 items-center justify-center text-[10px] text-zinc-500"
                              aria-label={`Toggle tasks for ${project.name}`}
                            >
                              <span className={projectExpanded ? '' : '-rotate-90'}>▾</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectProject(project.id)}
                              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                                isSelected
                                  ? 'bg-[var(--color-dark-hover)] text-zinc-100'
                                  : 'text-zinc-400 hover:bg-[var(--color-dark-hover)] hover:text-zinc-200'
                              }`}
                            >
                              <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span className="truncate">{project.name}</span>
                              <span className="ml-auto text-[10px] text-zinc-600">{projectTasks.length}</span>
                            </button>
                          </div>

                          {projectExpanded &&
                            projectTasks.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => handleSelectTask(task.id, project.id)}
                                className="flex w-full items-center gap-2 py-1 pl-14 pr-3 text-left text-xs text-zinc-500 hover:bg-[var(--color-dark-hover)] hover:text-zinc-300"
                              >
                                <span className="truncate">{task.title}</span>
                              </button>
                            ))}
                        </div>
                      )
                    })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
