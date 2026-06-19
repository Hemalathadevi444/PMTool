import { createContext, useCallback, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { Project, Task, Workspace } from '../api/types'

export type ViewMode = 'project' | 'my-tasks' | 'workspace' | 'tags'

interface AppShellContextValue {
  workspaces: Workspace[]
  projects: Project[]
  tasksByProject: Record<string, Task[]>
  selectedWorkspaceId: string | null
  selectedProjectId: string | null
  selectedTaskId: string | null
  viewMode: ViewMode
  myTasks: Task[]
  setWorkspaces: Dispatch<SetStateAction<Workspace[]>>
  setProjects: Dispatch<SetStateAction<Project[]>>
  setTasksByProject: Dispatch<SetStateAction<Record<string, Task[]>>>
  setMyTasks: Dispatch<SetStateAction<Task[]>>
  selectWorkspace: (workspaceId: string | null) => void
  selectProject: (projectId: string | null) => void
  showHome: () => void
  showMyTasks: () => void
  showTags: () => void
  openTaskDetail: (taskId: string, projectId?: string) => void
  closeTaskDetail: () => void
  onTaskUpdated: () => void
  setOnTaskUpdated: (fn: () => void) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({})
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('project')
  const [refreshCallback, setRefreshCallback] = useState<(() => void) | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const selectWorkspace = useCallback((workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId)
    setViewMode('workspace')
  }, [])

  const selectProject = useCallback(
    (projectId: string | null) => {
      setSelectedProjectId(projectId)
      setViewMode('project')
      const project = projects.find((p) => p.id === projectId)
      if (project) setSelectedWorkspaceId(project.workspace_id)
    },
    [projects],
  )

  const showHome = useCallback(() => {
    setSelectedWorkspaceId(null)
    setSelectedProjectId(null)
    setViewMode('workspace')
  }, [])

  const showMyTasks = useCallback(() => {
    setViewMode('my-tasks')
  }, [])

  const showTags = useCallback(() => {
    setViewMode('tags')
  }, [])

  const openTaskDetail = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
  }, [])

  const closeTaskDetail = useCallback(() => {
    setSelectedTaskId(null)
    refreshCallback?.()
  }, [refreshCallback])

  const onTaskUpdated = useCallback(() => {
    refreshCallback?.()
  }, [refreshCallback])

  const setOnTaskUpdated = useCallback((fn: () => void) => {
    setRefreshCallback(() => fn)
  }, [])

  const value = useMemo(
    () => ({
      workspaces,
      projects,
      tasksByProject,
      selectedWorkspaceId,
      selectedProjectId,
      selectedTaskId,
      viewMode,
      myTasks,
      setWorkspaces,
      setProjects,
      setTasksByProject,
      setMyTasks,
      selectWorkspace,
      selectProject,
      showHome,
      showMyTasks,
      showTags,
      openTaskDetail,
      closeTaskDetail,
      onTaskUpdated,
      setOnTaskUpdated,
      searchQuery,
      setSearchQuery,
    }),
    [
      workspaces,
      projects,
      tasksByProject,
      selectedWorkspaceId,
      selectedProjectId,
      selectedTaskId,
      viewMode,
      myTasks,
      selectWorkspace,
      selectProject,
      showHome,
      showMyTasks,
      showTags,
      openTaskDetail,
      closeTaskDetail,
      onTaskUpdated,
      setOnTaskUpdated,
      searchQuery,
      setSearchQuery,
    ],
  )

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
}

export function useAppShell() {
  const ctx = useContext(AppShellContext)
  if (!ctx) throw new Error('useAppShell must be used within AppShellProvider')
  return ctx
}
