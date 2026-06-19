import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  login as apiLogin,
  loginWithMicrosoft as apiLoginWithMicrosoft,
  signup as apiSignup,
  verifyLoginOtp as apiVerifyLoginOtp,
  requestRegisterOtp as apiRequestRegisterOtp,
} from '../api/auth'
import { ApiError } from '../api/http'
import type { User } from '../api/types'

const TOKEN_KEY = 'pm_access_token'
const USER_KEY = 'pm_user'

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string) => Promise<{ requireOtp: boolean; otp?: string }>
  loginWithMicrosoft: (idToken: string) => Promise<void>
  signup: (email: string, fullName: string, otp: string, password?: string) => Promise<void>
  verifyLoginOtp: (email: string, otp: string) => Promise<void>
  requestRegisterOtp: (email: string) => Promise<string | undefined>
  logout: () => void
  authError: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(() => loadStoredUser())
  const [authError, setAuthError] = useState<string | null>(null)

  const persist = useCallback((accessToken: string, nextUser: User) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setToken(accessToken)
    setUser(nextUser)
  }, [])

  const login = useCallback(
    async (email: string): Promise<{ requireOtp: boolean; otp?: string }> => {
      setAuthError(null)
      try {
        const data = await apiLogin({ email: email.trim() })
        return { requireOtp: data.require_otp, otp: data.otp }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Login failed'
        setAuthError(message)
        throw err
      }
    },
    [],
  )

  const verifyLoginOtp = useCallback(
    async (email: string, otp: string) => {
      setAuthError(null)
      try {
        const data = await apiVerifyLoginOtp({ email: email.trim(), otp: otp.trim() })
        persist(data.access_token, data.user)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'OTP verification failed'
        setAuthError(message)
        throw err
      }
    },
    [persist],
  )

  const requestRegisterOtp = useCallback(
    async (email: string): Promise<string | undefined> => {
      setAuthError(null)
      try {
        const res = await apiRequestRegisterOtp({ email: email.trim() })
        return res.otp
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to send registration OTP'
        setAuthError(message)
        throw err
      }
    },
    [],
  )

  const loginWithMicrosoft = useCallback(
    async (idToken: string) => {
      setAuthError(null)
      try {
        const data = await apiLoginWithMicrosoft(idToken)
        persist(data.access_token, data.user)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Microsoft login failed'
        setAuthError(message)
        throw err
      }
    },
    [persist],
  )

  const signup = useCallback(
    async (email: string, fullName: string, otp: string, password?: string) => {
      setAuthError(null)
      try {
        const data = await apiSignup({ email: email.trim(), full_name: fullName.trim(), password, otp: otp.trim() })
        persist(data.access_token, data.user)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Signup failed'
        setAuthError(message)
        throw err
      }
    },
    [persist],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      loginWithMicrosoft,
      signup,
      verifyLoginOtp,
      requestRegisterOtp,
      logout,
      authError,
      clearError: () => setAuthError(null),
    }),
    [user, token, login, loginWithMicrosoft, signup, verifyLoginOtp, requestRegisterOtp, logout, authError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
