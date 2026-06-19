import { Link, Outlet } from 'react-router-dom'
import logo from '../assets/logo.png'
import { AppShellProvider, useAppShell } from '../context/AppShellContext'
import { GlobalSearchBar } from './GlobalSearchBar'
import { ProfileDropdown } from './ProfileDropdown'
import { TaskDetailPanel } from './TaskDetailPanel'

import type { Task } from '../api/types'

function AppLayoutContent() {
  const {
    workspaces,
    projects,
    selectedProjectId,
    selectedTaskId,
    closeTaskDetail,
    tasksByProject,
    myTasks,
  } = useAppShell()

  let selectedProject = projects.find((p) => p.id === selectedProjectId)
  if (selectedTaskId) {
    let activeTask: Task | undefined
    for (const projectTasks of Object.values(tasksByProject)) {
      const found = projectTasks.find((t) => t.id === selectedTaskId)
      if (found) {
        activeTask = found
        break
      }
    }
    if (!activeTask) {
      activeTask = myTasks.find((t) => t.id === selectedTaskId)
    }
    if (activeTask) {
      const proj = projects.find((p) => p.id === activeTask.project_id)
      if (proj) {
        selectedProject = proj
      }
    }
  }

  const selectedWorkspace = workspaces.find((ws) => ws.id === selectedProject?.workspace_id)

  return (
    <div className="flex h-screen flex-col theme-bg theme-text overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 theme-border theme-panel">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Home">
          <img src={logo} alt="Logo" className="h-8 w-auto" />
        </Link>
        <GlobalSearchBar />
        <div className="ml-auto flex shrink-0 items-center">
          <ProfileDropdown />
        </div>
      </header>

      <Outlet />

      <TaskDetailPanel
        taskId={selectedTaskId}
        workspaceName={selectedWorkspace?.name ?? 'Workspace'}
        projectName={selectedProject?.name ?? 'Project'}
        onClose={closeTaskDetail}
      />
    </div>
  )
}

export function AppLayout() {
  return (
    <AppShellProvider>
      <AppLayoutContent />
    </AppShellProvider>
  )
}
