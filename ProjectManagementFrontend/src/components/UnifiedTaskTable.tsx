import React, { useEffect, useMemo, useState, useRef } from 'react'
import { updateProject } from '../api/client'
import { ApiError } from '../api/http'
import type { Project, Tag, Task, TaskStatus, User, Workspace } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useAppShell } from '../context/AppShellContext'
import { AssigneeAvatar } from './AssigneeAvatar'
import {
  STATUS_COLORS,
  TASK_STATUS_OPTIONS,
} from '../utils/taskHelpers'
import { ProjectDashboardModal } from './ProjectDashboardModal'

interface UnifiedTaskTableProps {
  tasks: Task[]
  workspaces: Workspace[]
  projects: Project[]
  users: User[]
  loading: boolean
  selectedWorkspaceId: string | null
  selectedProjectId: string | null
  tags: Tag[]
  onSelectWorkspace: (workspaceId: string | null) => void
  onSelectProject: (projectId: string | null) => void
  onRefresh: () => Promise<void>
  onTaskClick: (taskId: string, projectId: string) => void
  onAddTask?: () => void
  onCreateWorkspace?: () => void
  onCreateProject?: () => void
  onCreateProjectInline?: (workspaceId: string) => void
  onCreateTask?: () => void
  onCreateTaskInline?: (projectId: string) => void
  onCreateSubTask?: () => void
  onAddSubtaskInline?: (parentTask: Task) => void
  onEditWorkspace?: (workspaceId: string) => void
  onEditProject?: (projectId: string) => void
  isMyTasks?: boolean
}

export function UnifiedTaskTable({
  tasks,
  workspaces,
  projects,
  users,
  loading,
  selectedWorkspaceId,
  selectedProjectId,
  tags,
  onSelectWorkspace,
  onSelectProject,
  onRefresh,
  onTaskClick,
  onCreateWorkspace,
  onCreateProject,
  onCreateTaskInline,
  onAddSubtaskInline,
  onEditWorkspace,
  onEditProject,
  isMyTasks = false,
}: UnifiedTaskTableProps) {
  const { token } = useAuth()

  // Column width config for the 8 project-level columns
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    workspace: 150,
    project: 200,
    category: 110,
    status: 110,
    due_date: 110,
    tags: 150,
    priority: 110,
    owner: 110,
  })

  const totalWidth = useMemo(() => {
    return Object.values(colWidths).reduce((a, b) => a + b, 0)
  }, [colWidths])

  const startResize = (e: React.MouseEvent, colKey: string) => {
    e.stopPropagation()
    e.preventDefault()

    const startX = e.clientX
    const startWidth = colWidths[colKey]

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const newWidth = Math.max(60, startWidth + deltaX)
      setColWidths((prev) => ({
        ...prev,
        [colKey]: newWidth,
      }))
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Dashboard state & filters
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCreateDropdownOpen(false)
      }
    }
    if (createDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [createDropdownOpen])

  const { searchQuery } = useAppShell()
  const search = searchQuery
  const [selectedStatusLocal, setSelectedStatusLocal] = useState<string>('all')
  const [selectedTagLocal, setSelectedTagLocal] = useState<string>('all')
  const [selectedOwnerLocal, setSelectedOwnerLocal] = useState<string>('all')
  const [selectedPriorityLocal, setSelectedPriorityLocal] = useState<string>('all')
  const [selectedCategoryLocal, setSelectedCategoryLocal] = useState<string>('all')
  const [selectedStartDateLocal, setSelectedStartDateLocal] = useState<string>('')
  const [selectedEndDateLocal, setSelectedEndDateLocal] = useState<string>('')
  const [appliedStartDate, setAppliedStartDate] = useState<string>('')
  const [appliedEndDate, setAppliedEndDate] = useState<string>('')
  const [activeHeaderFilter, setActiveHeaderFilter] = useState<'workspace' | 'project' | 'category' | 'status' | 'tag' | 'owner' | 'due_date' | 'priority' | null>(null)

  // Search filter states
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [statusSearch, setStatusSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [prioritySearch, setPrioritySearch] = useState('')

  useEffect(() => {
    setWorkspaceSearch('')
    setProjectSearch('')
    setCategorySearch('')
    setStatusSearch('')
    setTagSearch('')
    setOwnerSearch('')
    setPrioritySearch('')

    if (activeHeaderFilter === 'due_date') {
      setSelectedStartDateLocal(appliedStartDate)
      setSelectedEndDateLocal(appliedEndDate)
    }
  }, [activeHeaderFilter, appliedStartDate, appliedEndDate])

  const [dashboardProjectId, setDashboardProjectId] = useState<string | null>(null)
  const [activeStatusSelectProjId, setActiveStatusSelectProjId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmStatusChange, setConfirmStatusChange] = useState<{
    projId: string
    newStatus: TaskStatus
    projName: string
    currentStatusLabel: string
    newStatusLabel: string
  } | null>(null)

  const workspaceMap = useMemo(() => new Map(workspaces.map((w) => [w.id, w])), [workspaces])

  const handleProjectStatusChange = async (projId: string, newStatus: TaskStatus) => {
    if (!token) return
    setActionError(null)
    try {
      await updateProject(token, projId, { status: newStatus })
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update project status')
      setTimeout(() => setActionError(null), 6000)
    }
  }

  const handleProjectStatusChangeInitiate = (projId: string, projName: string, currentStatus: TaskStatus, newStatus: TaskStatus) => {
    if (currentStatus === newStatus) return
    const currentStatusLabel = TASK_STATUS_OPTIONS.find((o) => o.value === currentStatus)?.label ?? currentStatus
    const newStatusLabel = TASK_STATUS_OPTIONS.find((o) => o.value === newStatus)?.label ?? newStatus
    setConfirmStatusChange({
      projId,
      newStatus,
      projName,
      currentStatusLabel,
      newStatusLabel
    })
  }

  const toggleHeaderFilter = (filter: typeof activeHeaderFilter) => {
    setActiveHeaderFilter((prev) => (prev === filter ? null : filter))
  }

  interface TableRowItem {
    type: 'workspace' | 'project'
    id: string
    workspaceId: string
    projectId?: string
    workspace?: Workspace
    project?: Project
  }

  // 1. Group Workspaces & Projects for main table
  const sortedAndGroupedItems = useMemo(() => {
    const list: TableRowItem[] = []

    workspaces.forEach((ws) => {
      const wsProjects = projects.filter((p) => p.workspace_id === ws.id)
      if (wsProjects.length === 0) {
        list.push({
          type: 'workspace',
          id: `ws-${ws.id}`,
          workspaceId: ws.id,
          workspace: ws,
        })
      } else {
        wsProjects.forEach((proj) => {
          list.push({
            type: 'project',
            id: `proj-${proj.id}`,
            workspaceId: ws.id,
            projectId: proj.id,
            project: proj,
          })
        })
      }
    })

    // Handle orphan projects
    const processedProjIds = new Set(projects.filter(p => workspaces.some(w => w.id === p.workspace_id)).map(p => p.id))
    const orphanProjects = projects.filter(p => !processedProjIds.has(p.id))
    if (orphanProjects.length > 0) {
      orphanProjects.forEach((proj) => {
        list.push({
          type: 'project',
          id: `proj-${proj.id}`,
          workspaceId: 'orphan-workspace',
          projectId: proj.id,
          project: proj,
        })
      })
    }

    return list
  }, [workspaces, projects])

  // 2. Filter list of items
  const filteredDisplayItems = useMemo(() => {
    const resultList: TableRowItem[] = []
    const visibleWorkspaceIds = new Set<string>()
    const visibleProjectIds = new Set<string>()

    const searchLower = search.trim().toLowerCase()
    const selectedWorkspace = selectedWorkspaceId ?? 'all'
    const selectedProject = selectedProjectId ?? 'all'

    projects.forEach((proj) => {
      const wsId = proj.workspace_id
      const ws = workspaceMap.get(wsId)

      const wsIdToCompare = wsId || 'unassigned-workspace'
      if (selectedWorkspace !== 'all' && wsIdToCompare !== selectedWorkspace) return
      if (selectedProject !== 'all' && proj.id !== selectedProject) return

      // Status filter
      if (selectedStatusLocal !== 'all' && proj.status !== selectedStatusLocal) return

      // Tags filter (multi-tags match)
      if (selectedTagLocal !== 'all') {
        const hasTag = proj.tags?.some((t) => t.id === selectedTagLocal)
        if (!hasTag) return
      }

      // Owner filter
      if (selectedOwnerLocal !== 'all' && proj.owner_id !== selectedOwnerLocal) return

      // Priority filter
      if (selectedPriorityLocal !== 'all' && (proj.priority?.toLowerCase() !== selectedPriorityLocal)) return

      // Category filter
      if (selectedCategoryLocal !== 'all' && proj.category !== selectedCategoryLocal) return

      // If we are in My Tasks view, only show projects with tasks assigned to the user
      if (isMyTasks) {
        const hasAssignedTask = tasks.some((t) => t.project_id === proj.id)
        if (!hasAssignedTask) return
      }

      // Due date range filter matching project's tasks due dates
      if (appliedStartDate || appliedEndDate) {
        const projTasks = tasks.filter(t => t.project_id === proj.id)
        const hasMatchingTask = projTasks.some(t => {
          if (!t.due_date) return false
          const taskDateStr = t.due_date.split('T')[0]
          if (appliedStartDate && taskDateStr < appliedStartDate) return false
          if (appliedEndDate && taskDateStr > appliedEndDate) return false
          return true
        })
        if (!hasMatchingTask) return
      }

      // Search match
      if (searchLower) {
        const matchProjName = proj.name.toLowerCase().includes(searchLower)
        const matchProjDesc = proj.description?.toLowerCase().includes(searchLower) ?? false
        const matchWsName = ws ? ws.name.toLowerCase().includes(searchLower) : false
        const matchCategory = proj.category?.toLowerCase().includes(searchLower) ?? false
        if (!matchProjName && !matchProjDesc && !matchWsName && !matchCategory) return
      }

      visibleProjectIds.add(proj.id)
      visibleWorkspaceIds.add(wsIdToCompare)
    })

    workspaces.forEach((ws) => {
      if (selectedWorkspace !== 'all' && ws.id !== selectedWorkspace) return

      let isVisible = false
      if (!isMyTasks && !searchLower && selectedStatusLocal === 'all' && selectedTagLocal === 'all' && selectedOwnerLocal === 'all' && selectedPriorityLocal === 'all' && selectedCategoryLocal === 'all' && !appliedStartDate && !appliedEndDate) {
        isVisible = true
      } else if (visibleWorkspaceIds.has(ws.id)) {
        isVisible = true
      } else if (searchLower) {
        if (ws.name.toLowerCase().includes(searchLower)) {
          isVisible = true
        }
      }

      if (isVisible) {
        visibleWorkspaceIds.add(ws.id)
      }
    })

    if (visibleWorkspaceIds.has('orphan-workspace')) {
      visibleWorkspaceIds.add('orphan-workspace')
    }

    sortedAndGroupedItems.forEach((item) => {
      if (item.type === 'workspace') {
        if (visibleWorkspaceIds.has(item.workspaceId)) {
          resultList.push(item)
        }
      } else if (item.type === 'project') {
        if (visibleProjectIds.has(item.projectId || '')) {
          resultList.push(item)
        }
      }
    })

    return resultList
  }, [
    sortedAndGroupedItems,
    selectedWorkspaceId,
    selectedProjectId,
    selectedStatusLocal,
    selectedTagLocal,
    selectedOwnerLocal,
    selectedPriorityLocal,
    selectedCategoryLocal,
    appliedStartDate,
    appliedEndDate,
    search,
    projects,
    workspaces,
    workspaceMap,
    tasks,
    isMyTasks,
  ])

  // Filter dropdown render helpers
  const renderWorkspaceFilter = () => {
    const activeWorkspace = selectedWorkspaceId ?? 'all'
    const filteredWs = workspaces.filter(w => w.name.toLowerCase().includes(workspaceSearch.toLowerCase()))
    return (
      <div className="absolute left-0 mt-2 w-56 rounded-lg shadow-xl py-1 z-35 border theme-border theme-modal">
        <div className="px-2.5 py-1.5 border-b theme-border">
          <input
            type="text"
            value={workspaceSearch}
            onChange={(e) => setWorkspaceSearch(e.target.value)}
            placeholder="Search workspace..."
            className="w-full text-xs rounded border px-2 py-1 theme-input outline-none focus:border-violet-500"
          />
        </div>
        <button
          onClick={() => { onSelectWorkspace(null); toggleHeaderFilter(null) }}
          className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover ${activeWorkspace === 'all' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
        >
          All Workspaces
        </button>
        <div className="max-h-48 overflow-y-auto divide-y theme-border">
          {filteredWs.map((w) => (
            <button
              key={w.id}
              onClick={() => { onSelectWorkspace(w.id); toggleHeaderFilter(null) }}
              className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover flex justify-between items-center ${activeWorkspace === w.id ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
            >
              <span className="truncate">{w.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderProjectFilter = () => {
    const activeProject = selectedProjectId ?? 'all'
    const filteredProj = projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
    return (
      <div className="absolute left-0 mt-2 w-56 rounded-lg shadow-xl py-1 z-35 border theme-border theme-modal">
        <div className="px-2.5 py-1.5 border-b theme-border">
          <input
            type="text"
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            placeholder="Search project..."
            className="w-full text-xs rounded border px-2 py-1 theme-input outline-none focus:border-violet-500"
          />
        </div>
        <button
          onClick={() => { onSelectProject(null); toggleHeaderFilter(null) }}
          className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover ${activeProject === 'all' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
        >
          All Projects
        </button>
        <div className="max-h-48 overflow-y-auto divide-y theme-border">
          {filteredProj.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelectProject(p.id); toggleHeaderFilter(null) }}
              className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover flex justify-between items-center ${activeProject === p.id ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
            >
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderStatusFilter = () => {
    const filteredStatus = TASK_STATUS_OPTIONS.filter(o => o.label.toLowerCase().includes(statusSearch.toLowerCase()))
    return (
      <div className="absolute left-0 mt-2 w-48 rounded-lg shadow-xl py-1 z-35 border theme-border theme-modal">
        <div className="px-2.5 py-1.5 border-b theme-border">
          <input
            type="text"
            value={statusSearch}
            onChange={(e) => setStatusSearch(e.target.value)}
            placeholder="Search status..."
            className="w-full text-xs rounded border px-2 py-1 theme-input outline-none focus:border-violet-500"
          />
        </div>
        <button
          onClick={() => { setSelectedStatusLocal('all'); toggleHeaderFilter(null) }}
          className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover ${selectedStatusLocal === 'all' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
        >
          All Statuses
        </button>
        <div className="max-h-48 overflow-y-auto">
          {filteredStatus.map((o) => (
            <button
              key={o.value}
              onClick={() => { setSelectedStatusLocal(o.value); toggleHeaderFilter(null) }}
              className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover flex justify-between items-center ${selectedStatusLocal === o.value ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
            >
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderTagFilter = () => {
    const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    return (
      <div className="absolute left-0 mt-2 w-48 rounded-lg shadow-xl py-1 z-35 border theme-border theme-modal">
        <div className="px-2.5 py-1.5 border-b theme-border">
          <input
            type="text"
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            placeholder="Search tag..."
            className="w-full text-xs rounded border px-2 py-1 theme-input outline-none focus:border-violet-500"
          />
        </div>
        <button
          onClick={() => { setSelectedTagLocal('all'); toggleHeaderFilter(null) }}
          className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover ${selectedTagLocal === 'all' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
        >
          All Tags
        </button>
        <div className="max-h-48 overflow-y-auto divide-y theme-border">
          {filteredTags.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelectedTagLocal(t.id); toggleHeaderFilter(null) }}
              className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover flex justify-between items-center ${selectedTagLocal === t.id ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
            >
              <span className="truncate" style={{ color: t.color }}>{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderOwnerFilter = () => {
    const filteredOwners = users.filter(u => u.full_name.toLowerCase().includes(ownerSearch.toLowerCase()))
    return (
      <div className="absolute left-0 mt-2 w-56 rounded-lg shadow-xl py-1 z-35 border theme-border theme-modal">
        <div className="px-2.5 py-1.5 border-b theme-border">
          <input
            type="text"
            value={ownerSearch}
            onChange={(e) => setOwnerSearch(e.target.value)}
            placeholder="Search owner..."
            className="w-full text-xs rounded border px-2 py-1 theme-input outline-none focus:border-violet-500"
          />
        </div>
        <button
          onClick={() => { setSelectedOwnerLocal('all'); toggleHeaderFilter(null) }}
          className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover ${selectedOwnerLocal === 'all' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
        >
          All Owners
        </button>
        <div className="max-h-48 overflow-y-auto divide-y theme-border">
          {filteredOwners.map((u) => (
            <button
              key={u.id}
              onClick={() => { setSelectedOwnerLocal(u.id); toggleHeaderFilter(null) }}
              className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover flex justify-between items-center ${selectedOwnerLocal === u.id ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
            >
              <span className="truncate">{u.full_name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const uniquePriorities = useMemo(() => {
    const set = new Set<string>(['low', 'medium', 'high', 'critical', 'urgent'])
    projects.forEach(p => {
      if (p.priority) {
        set.add(p.priority.toLowerCase())
      }
    })
    return Array.from(set).map(val => ({
      value: val,
      label: val.charAt(0).toUpperCase() + val.slice(1)
    }))
  }, [projects])

  const renderPriorityFilter = () => {
    const filteredPriority = uniquePriorities.filter(o => o.label.toLowerCase().includes(prioritySearch.toLowerCase()))
    return (
      <div className="absolute left-0 mt-2 w-48 rounded-lg shadow-xl py-1 z-35 border theme-border theme-modal">
        <div className="px-2.5 py-1.5 border-b theme-border">
          <input
            type="text"
            value={prioritySearch}
            onChange={(e) => setPrioritySearch(e.target.value)}
            placeholder="Search priority..."
            className="w-full text-xs rounded border px-2 py-1 theme-input outline-none focus:border-violet-500"
          />
        </div>
        <button
          onClick={() => { setSelectedPriorityLocal('all'); toggleHeaderFilter(null) }}
          className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover ${selectedPriorityLocal === 'all' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
        >
          All Priorities
        </button>
        <div className="max-h-48 overflow-y-auto divide-y theme-border">
          {filteredPriority.map((o) => (
            <button
              key={o.value}
              onClick={() => { setSelectedPriorityLocal(o.value); toggleHeaderFilter(null) }}
              className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover flex justify-between items-center ${selectedPriorityLocal === o.value ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
            >
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>(['HIS', 'SAP', 'PACS', 'PRISM', 'One AIG'])
    projects.forEach(p => {
      if (p.category) {
        set.add(p.category.trim())
      }
    })
    return Array.from(set).map(val => ({
      value: val,
      label: val
    }))
  }, [projects])

  const renderCategoryFilter = () => {
    const filteredCategory = uniqueCategories.filter(o => o.label.toLowerCase().includes(categorySearch.toLowerCase()))
    return (
      <div className="absolute left-0 mt-2 w-48 rounded-lg shadow-xl py-1 z-35 border theme-border theme-modal">
        <div className="px-2.5 py-1.5 border-b theme-border">
          <input
            type="text"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Search category..."
            className="w-full text-xs rounded border px-2 py-1 theme-input outline-none focus:border-violet-500"
          />
        </div>
        <button
          onClick={() => { setSelectedCategoryLocal('all'); toggleHeaderFilter(null) }}
          className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover ${selectedCategoryLocal === 'all' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
        >
          All Categories
        </button>
        <div className="max-h-48 overflow-y-auto divide-y theme-border">
          {filteredCategory.map((o) => (
            <button
              key={o.value}
              onClick={() => { setSelectedCategoryLocal(o.value); toggleHeaderFilter(null) }}
              className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:theme-hover flex justify-between items-center ${selectedCategoryLocal === o.value ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 font-semibold' : ''}`}
            >
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderDueDateFilter = () => {
    return (
      <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-xl p-3.5 z-35 border theme-border theme-modal space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider theme-text-muted">Start Date</label>
          <input
            type="date"
            value={selectedStartDateLocal}
            onChange={(e) => setSelectedStartDateLocal(e.target.value)}
            className="w-full text-xs rounded border px-2.5 py-1.5 theme-input outline-none focus:border-violet-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider theme-text-muted">End Date</label>
          <input
            type="date"
            value={selectedEndDateLocal}
            onChange={(e) => setSelectedEndDateLocal(e.target.value)}
            className="w-full text-xs rounded border px-2.5 py-1.5 theme-input outline-none focus:border-violet-500"
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={() => {
              setSelectedStartDateLocal('')
              setSelectedEndDateLocal('')
              setAppliedStartDate('')
              setAppliedEndDate('')
              toggleHeaderFilter(null)
            }}
            className="px-2.5 py-1 text-xs rounded border theme-border theme-text hover:theme-hover cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={() => {
              setAppliedStartDate(selectedStartDateLocal)
              setAppliedEndDate(selectedEndDateLocal)
              toggleHeaderFilter(null)
            }}
            className="px-3.5 py-1 text-xs rounded bg-violet-600 hover:bg-violet-500 text-white font-semibold cursor-pointer"
          >
            Apply
          </button>
        </div>
      </div>
    )
  }

  const renderWorkspaceCellContent = (wsId: string, wsName: string) => {
    if (wsId === 'orphan-workspace' || wsId === 'unassigned-workspace' || !wsId) {
      return <span className="truncate">{wsName}</span>
    }
    return (
      <div className="flex items-center justify-between gap-1 group/cell min-w-0 max-w-full">
        {onEditWorkspace ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEditWorkspace(wsId)
            }}
            className="text-left font-semibold theme-text hover:text-violet-600 focus:outline-none transition-colors truncate block min-w-0 flex-1 cursor-pointer"
          >
            {wsName}
          </button>
        ) : (
          <span className="truncate font-semibold">{wsName}</span>
        )}
      </div>
    )
  }

  const renderProjectCellContent = (_projId: string | undefined, projName: string) => {
    return (
      <div className="flex items-center justify-between gap-1 group/cell min-w-0 max-w-full">
        <span className="truncate theme-text font-semibold">{projName}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden theme-bg">
      {actionError && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-500/50 bg-red-950/90 px-4 py-2 text-sm text-red-200 shadow-lg flex items-center gap-3">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="text-red-300 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Toolbar: Create button with dropdown */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold theme-text-muted uppercase tracking-wider select-none">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          All Workspaces &amp; Projects
        </div>

        {/* Single Create dropdown button */}
        {(onCreateWorkspace || onCreateProject) && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              id="create-dropdown-btn"
              onClick={() => setCreateDropdownOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[11px] px-3.5 py-1.5 transition-all cursor-pointer select-none hover:scale-[1.02] active:scale-[0.98] shadow-md"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create
              <svg
                className={`h-2.5 w-2.5 ml-0.5 transition-transform duration-150 ${createDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {createDropdownOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-48 rounded-xl shadow-2xl border theme-border theme-modal z-50 overflow-hidden py-1.5 animate-fade-in">
                {onCreateWorkspace && (
                  <button
                    type="button"
                    id="create-workspace-option"
                    onClick={() => { setCreateDropdownOpen(false); onCreateWorkspace() }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs theme-text hover:bg-violet-500/10 hover:text-violet-500 transition-colors cursor-pointer select-none"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/15 text-violet-500 shrink-0">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m8 4v10" />
                      </svg>
                    </span>
                    <div className="text-left">
                      <p className="font-semibold leading-tight">Workspace</p>
                      <p className="text-[10px] theme-text-muted leading-tight mt-0.5">New team workspace</p>
                    </div>
                  </button>
                )}
                {onCreateProject && (
                  <button
                    type="button"
                    id="create-project-option"
                    onClick={() => { setCreateDropdownOpen(false); onCreateProject() }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs theme-text hover:bg-violet-500/10 hover:text-violet-500 transition-colors cursor-pointer select-none"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-500 shrink-0">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </span>
                    <div className="text-left">
                      <p className="font-semibold leading-tight">Project</p>
                      <p className="text-[10px] theme-text-muted leading-tight mt-0.5">New project board</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto border theme-border rounded-xl m-4 mt-3 theme-modal shadow-sm relative">
        {loading && projects.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <span className="text-sm theme-text-secondary">Loading your workspace...</span>
          </div>
        ) : (
          <table className="w-full table-layout-fixed border-collapse text-left" style={{ minWidth: totalWidth }}>
            <colgroup>
              <col style={{ width: colWidths.workspace }} />
              <col style={{ width: colWidths.project }} />
              <col style={{ width: colWidths.category }} />
              <col style={{ width: colWidths.status }} />
              <col style={{ width: colWidths.due_date }} />
              <col style={{ width: colWidths.tags }} />
              <col style={{ width: colWidths.priority }} />
              <col style={{ width: colWidths.owner }} />
            </colgroup>
            <thead className="sticky top-0 z-20 theme-bg">
              <tr className="sticky top-0 z-20 theme-bg theme-text-muted text-left text-[11px] font-semibold uppercase tracking-wider select-none border-b theme-border">
                {/* Workspace */}
                <th className="px-2 py-3 relative min-w-0 border-r theme-border">
                  <div className="flex items-center justify-between gap-1 group/header w-full min-w-0">
                    <span className="truncate">Workspace</span>
                    <button
                      type="button"
                      onClick={() => toggleHeaderFilter('workspace')}
                      className={`header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition focus:outline-none cursor-pointer shrink-0 ${
                        selectedWorkspaceId !== null ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {activeHeaderFilter === 'workspace' && renderWorkspaceFilter()}
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-violet-500/50 active:bg-violet-600 transition-colors z-30"
                    onMouseDown={(e) => startResize(e, 'workspace')}
                  />
                </th>

                {/* Project */}
                <th className="px-2 py-3 relative min-w-0 border-r theme-border">
                  <div className="flex items-center justify-between gap-1 group/header w-full min-w-0">
                    <span className="truncate">Project</span>
                    <button
                      type="button"
                      onClick={() => toggleHeaderFilter('project')}
                      className={`header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition focus:outline-none cursor-pointer shrink-0 ${
                        selectedProjectId !== null ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {activeHeaderFilter === 'project' && renderProjectFilter()}
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-violet-500/50 active:bg-violet-600 transition-colors z-30"
                    onMouseDown={(e) => startResize(e, 'project')}
                  />
                </th>

                {/* Category */}
                <th className="px-2 py-3 relative min-w-0 border-r theme-border">
                  <div className="flex items-center justify-between gap-1 group/header w-full min-w-0">
                    <span className="truncate">Category</span>
                    <button
                      type="button"
                      onClick={() => toggleHeaderFilter('category')}
                      className={`header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition focus:outline-none cursor-pointer shrink-0 ${
                        selectedCategoryLocal !== 'all' ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {activeHeaderFilter === 'category' && renderCategoryFilter()}
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-violet-500/50 active:bg-violet-600 transition-colors z-30"
                    onMouseDown={(e) => startResize(e, 'category')}
                  />
                </th>

                {/* Status */}
                <th className="px-2 py-3 relative min-w-0 border-r theme-border">
                  <div className="flex items-center justify-between gap-1 group/header w-full min-w-0">
                    <span className="truncate">Status</span>
                    <button
                      type="button"
                      onClick={() => toggleHeaderFilter('status')}
                      className={`header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition focus:outline-none cursor-pointer shrink-0 ${
                        selectedStatusLocal !== 'all' ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {activeHeaderFilter === 'status' && renderStatusFilter()}
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-violet-500/50 active:bg-violet-600 transition-colors z-30"
                    onMouseDown={(e) => startResize(e, 'status')}
                  />
                </th>

                {/* Due Date */}
                <th className="px-2 py-3 relative min-w-0 border-r theme-border">
                  <div className="flex items-center justify-between gap-1 group/header w-full min-w-0">
                    <span className="truncate">Due date</span>
                    <button
                      type="button"
                      onClick={() => toggleHeaderFilter('due_date')}
                      className={`header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition focus:outline-none cursor-pointer shrink-0 ${
                        (appliedStartDate || appliedEndDate) ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {activeHeaderFilter === 'due_date' && renderDueDateFilter()}
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-violet-500/50 active:bg-violet-600 transition-colors z-30"
                    onMouseDown={(e) => startResize(e, 'due_date')}
                  />
                </th>

                {/* Tags */}
                <th className="px-2 py-3 relative min-w-0 border-r theme-border">
                  <div className="flex items-center justify-between gap-1 group/header w-full min-w-0">
                    <span className="truncate">Tags</span>
                    <button
                      type="button"
                      onClick={() => toggleHeaderFilter('tag')}
                      className={`header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition focus:outline-none cursor-pointer shrink-0 ${
                        selectedTagLocal !== 'all' ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {activeHeaderFilter === 'tag' && renderTagFilter()}
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-violet-500/50 active:bg-violet-600 transition-colors z-30"
                    onMouseDown={(e) => startResize(e, 'tags')}
                  />
                </th>

                {/* Priority */}
                <th className="px-2 py-3 relative min-w-0 border-r theme-border">
                  <div className="flex items-center justify-between gap-1 group/header w-full min-w-0">
                    <span className="truncate">Priority</span>
                    <button
                      type="button"
                      onClick={() => toggleHeaderFilter('priority')}
                      className={`header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition focus:outline-none cursor-pointer shrink-0 ${
                        selectedPriorityLocal !== 'all' ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {activeHeaderFilter === 'priority' && renderPriorityFilter()}
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-violet-500/50 active:bg-violet-600 transition-colors z-30"
                    onMouseDown={(e) => startResize(e, 'priority')}
                  />
                </th>

                {/* Owner */}
                <th className="px-2 py-3 relative min-w-0 last:border-r-0 border-r theme-border">
                  <div className="flex items-center justify-between gap-1 group/header w-full min-w-0">
                    <span className="truncate">Owner</span>
                    <button
                      type="button"
                      onClick={() => toggleHeaderFilter('owner')}
                      className={`header-filter-toggle p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition focus:outline-none cursor-pointer shrink-0 ${
                        selectedOwnerLocal !== 'all' ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {activeHeaderFilter === 'owner' && renderOwnerFilter()}
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-violet-500/50 active:bg-violet-600 transition-colors z-30"
                    onMouseDown={(e) => startResize(e, 'owner')}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border divide-[var(--color-dark-border)]">
              {filteredDisplayItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center align-middle theme-text-secondary theme-bg">
                    <div className="flex flex-col items-center justify-center py-8">
                      <p className="text-sm font-semibold theme-text">No items match your filters</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Try clearing your column filters or search input.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDisplayItems.map((item) => {
                  if (item.type === 'workspace') {
                    const wsName = item.workspace?.name ?? '—'
                    return (
                      <tr
                        key={item.id}
                        className="theme-bg group border-b theme-border select-none"
                      >
                        {/* Workspace */}
                        <td className="px-2 py-3 text-xs theme-text font-semibold max-w-0 relative hover:z-10 border-r theme-border">
                          {renderWorkspaceCellContent(item.workspaceId, wsName)}
                        </td>
                        {/* Project */}
                        <td className="px-2 py-3 text-xs text-zinc-350 truncate border-r theme-border">—</td>
                        {/* Category */}
                        <td className="px-2 py-3 text-xs text-zinc-355 border-r theme-border">—</td>
                        {/* Status */}
                        <td className="px-2 py-3 text-xs text-zinc-355 border-r theme-border">—</td>
                        {/* Due Date */}
                        <td className="px-2 py-3 text-xs text-zinc-355 border-r theme-border">—</td>
                        {/* Tags */}
                        <td className="px-2 py-3 text-xs text-zinc-355 border-r theme-border">—</td>
                        {/* Priority */}
                        <td className="px-2 py-3 text-xs text-zinc-355 border-r theme-border">—</td>
                        {/* Owner */}
                        <td className="px-2 py-3 text-xs text-zinc-355 border-r theme-border last:border-r-0">—</td>
                      </tr>
                    )
                  }

                  if (item.type === 'project') {
                    const proj = item.project
                    if (!proj) return null
                    let wsName = '—'
                    if (proj.workspace_id === 'orphan-workspace') {
                      wsName = 'Other Workspaces'
                    } else if (proj.workspace_id === 'unassigned-workspace') {
                      wsName = 'Unassigned Tasks Workspace'
                    } else {
                      wsName = workspaceMap.get(proj.workspace_id)?.name ?? '—'
                    }
                    const projName = proj.name
                    const owner = users.find((u) => u.id === proj.owner_id)
                    const ownerName = owner ? owner.full_name : 'Unknown Owner'

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setDashboardProjectId(proj.id)}
                        className="group transition-colors duration-150 theme-hover:hover border-b theme-border cursor-pointer select-none theme-bg"
                      >
                        {/* Workspace */}
                        <td className="px-2 py-3 text-xs theme-text-secondary font-medium max-w-0 relative hover:z-10 border-r theme-border">
                          {renderWorkspaceCellContent(proj.workspace_id, wsName)}
                        </td>
                        {/* Project */}
                        <td className="px-2 py-3 text-xs theme-text font-semibold max-w-0 relative hover:z-10 border-r theme-border">
                          <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                            {renderProjectCellContent(proj.id, projName)}
                          </div>
                        </td>
                        {/* Category */}
                        <td className="px-2 py-3 text-xs border-r theme-border font-semibold">
                          {proj.category ? (
                            <span className="inline-flex items-center rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 uppercase">
                              {proj.category}
                            </span>
                          ) : (
                            <span className="text-zinc-355">—</span>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-2 py-3 text-xs border-r theme-border" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block text-left">
                            <button
                                type="button"
                                onClick={() => setActiveStatusSelectProjId(activeStatusSelectProjId === proj.id ? null : proj.id)}
                                className={`status-select-toggle rounded border px-1.5 py-0.5 text-[10px] font-bold outline-none cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${STATUS_COLORS[proj.status]}`}
                            >
                              <span>{TASK_STATUS_OPTIONS.find((o) => o.value === proj.status)?.label ?? proj.status}</span>
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {activeStatusSelectProjId === proj.id && (
                              <div className="status-select-dropdown absolute left-0 mt-1 w-32 rounded-lg shadow-xl py-1 z-35 border theme-border theme-modal">
                                {TASK_STATUS_OPTIONS.map((o) => {
                                  const isActive = proj.status === o.value
                                  return (
                                    <button
                                      key={o.value}
                                      type="button"
                                      onClick={() => {
                                        handleProjectStatusChangeInitiate(proj.id, proj.name, proj.status, o.value as TaskStatus)
                                        setActiveStatusSelectProjId(null)
                                      }}
                                      className={`w-full text-left px-3 py-1.5 text-xs theme-text hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between cursor-pointer ${
                                        isActive ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 font-semibold' : ''
                                      }`}
                                    >
                                      <span>{o.label}</span>
                                      {isActive && (
                                        <svg className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Due Date */}
                        <td className="px-2 py-3 text-xs text-zinc-500 border-r theme-border font-semibold">
                          {proj.due_date ? new Date(proj.due_date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : '—'}
                        </td>
                        {/* Tags */}
                        <td className="px-2 py-3 text-xs border-r theme-border">
                          <div className="flex flex-wrap gap-1">
                            {proj.tags && proj.tags.length > 0 ? (
                              proj.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="inline-flex max-w-full truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold"
                                  style={{ color: tag.color, borderColor: tag.color, backgroundColor: `${tag.color}0a` }}
                                >
                                  {tag.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-355">—</span>
                            )}
                          </div>
                        </td>
                        {/* Priority */}
                        <td className="px-2 py-3 text-xs border-r theme-border font-semibold">
                          {proj.priority ? (
                            <span className="inline-flex items-center rounded bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-500 uppercase">
                              {proj.priority}
                            </span>
                          ) : (
                            <span className="text-zinc-355">—</span>
                          )}
                        </td>
                        {/* Owner */}
                        <td className="px-2 py-3 text-xs border-r theme-border last:border-r-0">
                          <AssigneeAvatar userId={proj.owner_id ?? 'proj-owner'} name={ownerName} index={0} size="sm" />
                        </td>
                      </tr>
                    )
                  }
                  return null
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <ProjectDashboardModal
        open={Boolean(dashboardProjectId)}
        project={projects.find((p) => p.id === dashboardProjectId) ?? null}
        tasks={tasks}
        users={users}
        tags={tags}
        token={token}
        onClose={() => setDashboardProjectId(null)}
        onTaskClick={onTaskClick}
        onCreateTaskInline={onCreateTaskInline}
        onAddSubtaskInline={onAddSubtaskInline}
        onEditProject={onEditProject}
        onRefresh={onRefresh}
      />

      {confirmStatusChange && (
        <div
          className="theme-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setConfirmStatusChange(null)}
          role="presentation"
        >
          <div
            className="theme-modal w-full max-w-[420px] rounded-2xl shadow-2xl p-6 border theme-border animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-status-title"
          >
            <div className="flex items-center gap-3 text-amber-500 mb-4 select-none">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 id="confirm-status-title" className="text-lg font-semibold theme-text">
                Change Status?
              </h3>
            </div>
            
            <p className="text-sm theme-text-secondary leading-relaxed">
              Are you sure you want to change the status of <strong>{confirmStatusChange.projName}</strong> from <span className="font-semibold">{confirmStatusChange.currentStatusLabel}</span> to <span className="font-semibold text-violet-500">{confirmStatusChange.newStatusLabel}</span>?
            </p>

            <div className="mt-6 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmStatusChange(null)}
                className="rounded-lg border theme-border px-4 py-2 text-xs font-semibold theme-text hover:theme-hover transition-colors cursor-pointer select-none"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { projId, newStatus } = confirmStatusChange
                  setConfirmStatusChange(null)
                  await handleProjectStatusChange(projId, newStatus)
                }}
                className="rounded-lg bg-violet-600 hover:bg-violet-500 px-5 py-2 text-xs font-semibold text-white transition-all shadow-md cursor-pointer select-none"
              >
                Yes, Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
