import type { Project, Workspace } from '../api/types'
import { workspaceBgColor, workspaceInitial } from '../utils/workspaceHelpers'

interface ProjectListPanelProps {
  workspace: Workspace | undefined
  workspaceIndex: number
  projects: Project[]
  loading: boolean
  selectedProjectId: string | null
  onSelectProject: (projectId: string) => void
  onAddProject?: () => void
}

export function ProjectListPanel({
  workspace,
  workspaceIndex,
  projects,
  loading,
  selectedProjectId,
  onSelectProject,
  onAddProject,
}: ProjectListPanelProps) {
  const wsColor = workspace ? workspaceBgColor(workspace.id, workspaceIndex) : '#64748b'

  return (
    <div className="flex flex-1 flex-col overflow-hidden theme-bg">
      <header className="flex items-center gap-4 border-b px-4 py-2 theme-border theme-bg">
        <div className="flex items-center gap-2 text-sm theme-text-secondary">
          {workspace && (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
              style={{ backgroundColor: wsColor }}
            >
              {workspaceInitial(workspace.name)}
            </span>
          )}
          <span className="font-medium theme-text">{workspace?.name ?? 'Workspace'}</span>
        </div>
        <div className="ml-auto">
          {onAddProject && (
            <button
              type="button"
              onClick={onAddProject}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f5c9e] bg-[#1f5c9e]"
            >
              + Project
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 theme-bg">
        {loading ? (
          <p className="text-sm theme-text-muted">Loading projects…</p>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium theme-text-secondary">No projects yet</p>
            <p className="mt-1 text-sm theme-text-muted">
              Create a project in this workspace to get started.
            </p>
            {onAddProject && (
              <button
                type="button"
                onClick={onAddProject}
                className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f5c9e] bg-[#1f5c9e]"
              >
                + Project
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border theme-border">
            <div className="grid grid-cols-[1fr_160px] gap-2 border-b px-4 py-2 text-[11px] font-medium uppercase tracking-wider theme-border theme-panel theme-text-muted">
              <span>Project name</span>
              <span>Created</span>
            </div>
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project.id)}
                className={`flex w-full items-center border-b px-4 py-3 text-left last:border-b-0 theme-border theme-hover ${
                  selectedProjectId === project.id ? 'bg-[var(--color-dark-hover)]' : ''
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 theme-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <span className="truncate text-sm font-medium theme-text">{project.name}</span>
                </div>
                <span className="text-xs theme-text-muted">
                  {new Date(project.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
