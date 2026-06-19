import type { ApiResponse } from './types'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
const REQUEST_TIMEOUT_MS = 15000

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function parseErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>

    if (typeof record.message === 'string') {
      return record.message
    }

    if (typeof record.detail === 'string') {
      return record.detail
    }

    if (Array.isArray(record.detail)) {
      return record.detail
        .map((item) => {
          if (item && typeof item === 'object' && 'msg' in item) {
            const loc = 'loc' in item && Array.isArray(item.loc) ? item.loc.join('.') : 'field'
            return `${loc}: ${String(item.msg)}`
          }
          return String(item)
        })
        .join('; ')
    }
  }

  if (status === 0) {
    return 'Cannot reach server. Is the backend running on port 8000?'
  }

  return `Request failed (${status})`
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timed out. Check whether the backend is responding on port 8000.', 0)
    }
    throw new ApiError('Cannot reach server. Is the backend running on port 8000?', 0)
  } finally {
    window.clearTimeout(timeoutId)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ApiError(`Invalid response from server (${response.status})`, response.status)
  }

  const apiBody = body as ApiResponse<T>

  if (!response.ok || apiBody.success === false) {
    throw new ApiError(parseErrorMessage(body, response.status), response.status)
  }

  if (apiBody.data === null || apiBody.data === undefined) {
    throw new ApiError('Empty response from server', response.status)
  }

  return apiBody.data
}
