import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { initials } from '../utils/taskHelpers'

export function ProfileDropdown() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
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

  if (!user) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white hover:ring-2 hover:ring-violet-400/50"
        style={{ backgroundColor: 'var(--color-profile-bg)' }}
        title={user.full_name}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {initials(user.full_name)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-lg border py-1 shadow-xl theme-border theme-panel"
        >
          <div className="border-b px-3 py-2 theme-border">
            <p className="truncate text-sm font-medium theme-text">{user.full_name}</p>
            <p className="truncate text-xs theme-text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm theme-text-secondary theme-hover"
          >
            <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
