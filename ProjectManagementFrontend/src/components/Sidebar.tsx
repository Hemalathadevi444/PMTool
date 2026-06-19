import type { ViewMode } from '../context/AppShellContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

interface SidebarProps {
  selectedWorkspaceId: string | null
  selectedProjectId: string | null
  viewMode: ViewMode
  onShowHome: () => void
  onShowMyTasks: () => void
  onShowTags: () => void
}

export function Sidebar({
  viewMode,
  onShowHome,
  onShowMyTasks,
  onShowTags,
}: SidebarProps) {
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex h-full">
      <aside
        className="flex w-14 flex-col items-center border-r py-4 theme-border"
        style={{ backgroundColor: 'var(--color-rail-bg)' }}
      >
        <button
          type="button"
          title="Home"
          onClick={onShowHome}
          className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg transition ${
            viewMode === 'workspace' || viewMode === 'project' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
          </svg>
        </button>

        <button
          type="button"
          title="My Tasks"
          onClick={onShowMyTasks}
          className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg transition ${
            viewMode === 'my-tasks' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </button>

        <button
          type="button"
          title="Tags"
          onClick={onShowTags}
          className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg transition ${
            viewMode === 'tags' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </button>

        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          >
            {theme === 'dark' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={logout}
            title="Logout"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </aside>
    </div>
  )
}
