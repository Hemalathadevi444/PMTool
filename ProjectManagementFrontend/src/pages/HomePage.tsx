import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  createProject,
  createSubtask,
  createTag,
  createTask,
  createWorkspace,
  getProjects,
  getTags,
  getTasks,
  getUsers,
  getWorkspaces,
  updateProject,
  updateWorkspace,
} from '../api/client'
import type { Project, Tag, Task, User } from '../api/types'
import { CreateProjectModal } from '../components/CreateProjectModal'
import type { CreateProjectFormData } from '../components/CreateProjectModal'
import { CreateSpaceModal } from '../components/CreateSpaceModal'
import type { CreateSpaceFormData } from '../components/CreateSpaceModal'
import { CreateTaskModal } from '../components/CreateTaskModal'
import type { CreateTaskFormData } from '../components/CreateTaskModal'
import { EditWorkspaceModal } from '../components/EditWorkspaceModal'
import { EditProjectModal } from '../components/EditProjectModal'
import { Sidebar } from '../components/Sidebar'
import { TagManagementPanel } from '../components/TagManagementPanel'
import { UnifiedTaskTable } from '../components/UnifiedTaskTable'
import { useAppShell } from '../context/AppShellContext'
import { useAuth } from '../context/AuthContext'
import { canAddSubtaskAtDepth, getSubtaskLimitMessage } from '../utils/taskHelpers'

function buildTasksByProject(tasks: Task[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {}
  for (const task of tasks) {
    if (!map[task.project_id]) map[task.project_id] = []
    map[task.project_id].push(task)
  }
  return map
}

export function HomePage() {
  const { token, user } = useAuth()
  const {
    workspaces,
    projects,
    tasksByProject,
    selectedProjectId,
    selectedWorkspaceId,
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
    setOnTaskUpdated,
    setSearchQuery,
  } = useAppShell()

  const [loading, setLoading] = useState(true)
  const [tagsLoading, setTagsLoading] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [projectWorkspaceId, setProjectWorkspaceId] = useState<string | null>(null)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [taskProjectId, setTaskProjectId] = useState<string | null>(null)
  const [subtaskParent, setSubtaskParent] = useState<Task | null>(null)
  const [subtaskParentDepth, setSubtaskParentDepth] = useState(0)
  const [subtaskError, setSubtaskError] = useState<string | null>(null)
  const [editWorkspaceId, setEditWorkspaceId] = useState<string | null>(null)
  const [editProjectId, setEditProjectId] = useState<string | null>(null)
  const [selectParentTaskOpen, setSelectParentTaskOpen] = useState(false)
  const [selectedParentTaskId, setSelectedParentTaskId] = useState('')
  const [parentSearchQuery, setParentSearchQuery] = useState('')

  const loadTags = useCallback(async () => {
    if (!token) {
      setTags([])
      return
    }
    setTagsLoading(true)
    try {
      const tagList = await getTags(token)
      setTags(tagList)
    } catch {
      setTags([])
    } finally {
      setTagsLoading(false)
    }
  }, [token])

  const refreshData = useCallback(async () => {
    if (!token) return
    const ws = await getWorkspaces(token)
    setWorkspaces(ws)

    const allProjects: Project[] = []
    for (const workspace of ws) {
      const projs = await getProjects(token, workspace.id)
      allProjects.push(...projs)
    }
    setProjects(allProjects)

    const allTasks = await getTasks(token, { rootOnly: false })
    setTasksByProject(buildTasksByProject(allTasks))

    if (user) {
      const assigned = await getTasks(token, { assigneeId: user.id, rootOnly: false })
      setMyTasks(assigned)
    }

    const userList = await getUsers(token)
    setUsers(userList)

    await loadTags()
  }, [token, user, setWorkspaces, setProjects, setTasksByProject, setMyTasks, loadTags])

  useEffect(() => {
    if (!token) return
    const authToken = token

    async function load() {
      setLoading(true)
      try {
        const ws = await getWorkspaces(authToken)
        setWorkspaces(ws)

        const allProjects: Project[] = []
        for (const workspace of ws) {
          const projs = await getProjects(authToken, workspace.id)
          allProjects.push(...projs)
        }
        setProjects(allProjects)

        const allTasks = await getTasks(authToken, { rootOnly: false })
        setTasksByProject(buildTasksByProject(allTasks))

        if (user) {
          const assigned = await getTasks(authToken, { assigneeId: user.id, rootOnly: false })
          setMyTasks(assigned)
        }

        const userList = await getUsers(authToken)
        setUsers(userList)

        await loadTags()

        // By default, do not select any workspace, keeping it null to show all workspaces, projects, and tasks
        selectWorkspace(null)
      } catch {
        setWorkspaces([])
        setProjects([])
        setTasksByProject({})
        setMyTasks([])
        setTags([])
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token, user, setWorkspaces, setProjects, setTasksByProject, setMyTasks, selectWorkspace, loadTags])



  useEffect(() => {
    setOnTaskUpdated(() => {
      void refreshData()
    })
  }, [setOnTaskUpdated, refreshData])

  useEffect(() => {
    if (!token || !selectedProjectId || viewMode !== 'project') return
    getTasks(token, { projectId: selectedProjectId, rootOnly: false })
      .then((taskList) => {
        setTasksByProject((prev) => ({ ...prev, [selectedProjectId]: taskList }))
      })
      .catch(() => {
        setTasksByProject((prev) => ({ ...prev, [selectedProjectId]: [] }))
      })
  }, [token, selectedProjectId, viewMode, setTasksByProject])

  useEffect(() => {
    if (!token || !user || viewMode !== 'my-tasks') return
    getTasks(token, { assigneeId: user.id, rootOnly: false })
      .then(setMyTasks)
      .catch(() => setMyTasks([]))
  }, [token, user, viewMode, setMyTasks])

  async function handleCreateProject(data: CreateProjectFormData) {
    if (!token) return
    const project = await createProject(token, {
      name: data.name,
      description: data.description || null,
      workspace_id: data.workspace_id,
      tag_ids: data.tag_ids,
      status: data.status,
      issue_type: data.issue_type,
      category: data.category,
      priority: data.priority,
      owner_id: data.owner_id,
      due_date: data.due_date || null,
    })
    setProjects((prev) => [...prev, project])
    setTasksByProject((prev) => ({ ...prev, [project.id]: [] }))
    showHome()
    setSearchQuery('')
  }

  async function handleCreateTagForProject(name: string, color: string): Promise<Tag> {
    if (!token) throw new Error('Not authenticated')
    const tag = await createTag(token, { name, color })
    setTags((prev) => [...prev, tag])
    return tag
  }


  function openCreateTask(projectId: string | null) {
    setTaskProjectId(projectId)
    setSubtaskParent(null)
    setCreateTaskOpen(true)
  }


  async function handleCreateTask(data: CreateTaskFormData) {
    if (!token) return
    if (subtaskParent) {
      const allTasks = Object.values(tasksByProject).flat()
      const localSubtaskCount = allTasks.filter(t => t.parent_task_id === subtaskParent.id).length
      const subtaskCount = Math.max(subtaskParent.subtask_count ?? 0, localSubtaskCount)
      if (!canAddSubtaskAtDepth(subtaskParentDepth, subtaskCount)) {
        setSubtaskError(getSubtaskLimitMessage(subtaskParentDepth))
        return
      }
      await createSubtask(token, subtaskParent.id, {
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date || null,
        assignee_ids: data.assignee_ids,
        tag_ids: data.tag_ids,
      })
    } else {
      await createTask(token, {
        title: data.title,
        description: data.description || null,
        project_id: data.project_id,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date || null,
        assignee_ids: data.assignee_ids,
        tag_ids: data.tag_ids,
      })
    }
    await refreshData()
    showHome()
    setSearchQuery('')
  }

  async function handleCreateSpace(data: CreateSpaceFormData) {
    if (!token) return
    const workspace = await createWorkspace(token, {
      name: data.name,
      description: data.description || null,
    })
    setWorkspaces((prev) => [...prev, workspace])
    showHome()
    setSearchQuery('')
  }

  
  const editingWorkspace = workspaces.find((ws) => ws.id === editWorkspaceId)
  const editingProject = projects.find((p) => p.id === editProjectId)
  const isMyTasks = viewMode === 'my-tasks'
  const isTagsView = viewMode === 'tags'

  // Flatten all projects tasks for unified table view
  const tasks = useMemo(() => {
    return isMyTasks
      ? myTasks
      : Object.values(tasksByProject).flat()
  }, [isMyTasks, myTasks, tasksByProject])

  const eligibleParentTasks = useMemo(() => {
    const allTasks = Object.values(tasksByProject).flat()
    const list = allTasks.filter((task) => !task.parent_task_id)

    if (!parentSearchQuery.trim()) return list
    const q = parentSearchQuery.toLowerCase()
    return list.filter((t) => t.title.toLowerCase().includes(q))
  }, [tasksByProject, parentSearchQuery])

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <Sidebar
        selectedWorkspaceId={selectedWorkspaceId}
        selectedProjectId={selectedProjectId}
        viewMode={viewMode}
        onShowHome={showHome}
        onShowMyTasks={showMyTasks}
        onShowTags={showTags}
      />

      <EditWorkspaceModal
        open={Boolean(editWorkspaceId)}
        workspace={editingWorkspace ?? null}
        onClose={() => setEditWorkspaceId(null)}
        onSubmit={async (name, description) => {
          if (!token || !editWorkspaceId) return
          const updated = await updateWorkspace(token, editWorkspaceId, { name, description })
          setWorkspaces((prev) => prev.map((ws) => (ws.id === updated.id ? updated : ws)))
        }}
      />

      <EditProjectModal
        open={Boolean(editProjectId)}
        project={editingProject ?? null}
        tags={tags}
        users={users}
        onClose={() => setEditProjectId(null)}
        onSubmit={async (projectId, data) => {
          if (!token) return
          const updated = await updateProject(token, projectId, {
            name: data.name,
            tag_ids: data.tag_ids,
            status: data.status,
            issue_type: data.issue_type,
            category: data.category,
            priority: data.priority,
            owner_id: data.owner_id || undefined,
            due_date: data.due_date || null,
            description: data.description || null,
          })
          setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          setTags((prev) => {
            updated.tags?.forEach((t) => {
              if (!prev.find((p) => p.id === t.id)) prev.push(t)
            })
            return [...prev]
          })
        }}
        onCreateTag={handleCreateTagForProject}
      />

      <CreateSpaceModal open={createSpaceOpen} onClose={() => setCreateSpaceOpen(false)} onSubmit={handleCreateSpace} />
      <CreateProjectModal
        open={createProjectOpen}
        workspaceId={projectWorkspaceId}
        workspaces={workspaces}
        tags={tags}
        users={users}
        onClose={() => {
          setCreateProjectOpen(false)
          setProjectWorkspaceId(null)
        }}
        onSubmit={handleCreateProject}
        onCreateTag={handleCreateTagForProject}
      />
      <CreateTaskModal
        open={createTaskOpen}
        projectId={taskProjectId}
        workspaces={workspaces}
        projects={projects}
        tags={tags}
        token={token}
        onClose={() => {
          setCreateTaskOpen(false)
          setTaskProjectId(null)
          setSubtaskParent(null)
          setSubtaskParentDepth(0)
          setSubtaskError(null)
        }}
        modalTitle={subtaskParent ? 'Create a Subtask' : 'Create a Task'}
        modalDescription={subtaskParent ? `Add a subtask under "${subtaskParent.title}"` : undefined}
        submitLabel={subtaskParent ? 'Create Subtask' : 'Create Task'}
        validationError={subtaskError}
        onSubmit={handleCreateTask}
        isSubtask={Boolean(subtaskParent)}
      />

      {subtaskError && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-500/50 bg-red-950/90 px-4 py-2 text-sm text-red-200 shadow-lg">
          {subtaskError}
          <button
            type="button"
            onClick={() => setSubtaskError(null)}
            className="ml-3 text-red-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {isTagsView ? (
        <TagManagementPanel tags={tags} loading={tagsLoading} onRefresh={loadTags} />
      ) : (
        <UnifiedTaskTable
          tasks={tasks}
          isMyTasks={isMyTasks}
          workspaces={workspaces}
          projects={projects}
          users={users}
          loading={loading}
          selectedWorkspaceId={selectedWorkspaceId}
          selectedProjectId={selectedProjectId}
          tags={tags}
          onSelectWorkspace={selectWorkspace}
          onSelectProject={selectProject}
          onRefresh={refreshData}
          onTaskClick={(taskId, projectId) => {
            const task = tasks.find((t) => t.id === taskId)
            openTaskDetail(taskId, projectId ?? task?.project_id ?? selectedProjectId ?? undefined)
          }}
          onCreateWorkspace={() => setCreateSpaceOpen(true)}
          onCreateProject={() => {
            const wsId = selectedWorkspaceId || workspaces[0]?.id
            if (!wsId) {
              alert('Please create a workspace first!')
              return
            }
            setProjectWorkspaceId(wsId)
            setCreateProjectOpen(true)
          }}
          onCreateProjectInline={(wsId) => {
            setProjectWorkspaceId(wsId)
            setCreateProjectOpen(true)
          }}
          onCreateTask={() => {
            const projId = selectedProjectId || projects[0]?.id
            if (!projId) {
              alert('Please create a project first!')
              return
            }
            openCreateTask(projId)
          }}
          onCreateTaskInline={(projId) => {
            openCreateTask(projId)
          }}
          onCreateSubTask={() => {
            const allTasks = Object.values(tasksByProject).flat()
            const hasRootTasks = allTasks.some(t => !t.parent_task_id)
            if (!hasRootTasks) {
              alert('Please create a task first before creating a sub task!')
              return
            }
            setSelectedParentTaskId('')
            setParentSearchQuery('')
            setSelectParentTaskOpen(true)
          }}
          onAddSubtaskInline={(parentTask) => {
            setSubtaskParent(parentTask)
            setSubtaskParentDepth(parentTask.parent_task_id ? 1 : 0)
            setTaskProjectId(parentTask.project_id)
            setCreateTaskOpen(true)
          }}
          onEditWorkspace={(wsId) => setEditWorkspaceId(wsId)}
          onEditProject={(projId) => setEditProjectId(projId)}
        />
      )}

      {selectParentTaskOpen && (
        <div
          className="theme-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectParentTaskOpen(false)}
          role="presentation"
        >
          <div
            className="theme-modal w-full max-w-[520px] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="select-parent-task-title"
          >
            <div className="flex items-start justify-between px-6 pt-6 shrink-0">
              <div>
                <h2 id="select-parent-task-title" className="text-xl font-semibold theme-text">
                  Select Parent Task
                </h2>
                <p className="mt-2 text-sm theme-text-secondary">
                  Type to search and select the parent task under which you want to create a sub task.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectParentTaskOpen(false)}
                className="rounded p-1 theme-text-muted theme-hover"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 pt-5 pb-3 shrink-0">
              <input
                type="text"
                value={parentSearchQuery}
                onChange={(e) => setParentSearchQuery(e.target.value)}
                placeholder="Search parent task by title..."
                className="theme-input w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-1 min-h-[150px] max-h-[300px]">
              {eligibleParentTasks.length === 0 ? (
                <p className="text-xs theme-text-muted text-center py-6">No matching parent tasks found</p>
              ) : (
                eligibleParentTasks.map((t) => {
                  const proj = projects.find((p) => p.id === t.project_id)
                  const isSelected = selectedParentTaskId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedParentTaskId(t.id)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-violet-600 text-white font-semibold shadow-md'
                          : 'theme-text hover:bg-zinc-800 dark:hover:bg-zinc-700/50'
                      }`}
                    >
                      <span className="truncate pr-4">
                        <span className={`mr-2 opacity-75 text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-white' : 'theme-text-muted'}`}>
                          [{proj?.name ?? 'Project'}]
                        </span>
                        <span>{t.title}</span>
                      </span>
                      {isSelected && <span className="text-sm shrink-0">✓</span>}
                    </button>
                  )
                })
              )}
            </div>

            <div className="px-6 py-4 border-t theme-border flex items-center justify-end gap-3 theme-bg shrink-0">
              <button
                type="button"
                onClick={() => setSelectParentTaskOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium theme-text-secondary hover:theme-text"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedParentTaskId}
                onClick={() => {
                  const allTasks = Object.values(tasksByProject).flat()
                  const parentTask = allTasks.find((t) => t.id === selectedParentTaskId)
                  if (parentTask) {
                    setSubtaskParent(parentTask)
                    setSubtaskParentDepth(0)
                    setTaskProjectId(parentTask.project_id)
                    setSelectParentTaskOpen(false)
                    setCreateTaskOpen(true)
                  }
                }}
                className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
