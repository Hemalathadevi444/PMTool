import { useEffect, type ReactNode } from 'react'
import { useTheme } from '../context/ThemeContext'
import { Logo } from './Logo'

interface AuthLayoutProps {
  title: string
  subtitle: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { theme } = useTheme()

  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    return () => {
      document.documentElement.dataset.theme = theme
    }
  }, [theme])

  return (
    <div className="auth-gradient flex min-h-screen flex-col items-center justify-center px-4 py-10" data-theme="light">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="mt-6 text-[28px] font-semibold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-2 text-[15px] text-gray-600">{subtitle}</p>
        </div>
        {children}
        {footer && <div className="mt-8 text-center text-sm text-gray-500">{footer}</div>}
      </div>
    </div>
  )
}
