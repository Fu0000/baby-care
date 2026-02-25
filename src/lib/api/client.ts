import {
  clearAuthSession,
  getAccessToken,
  getAuthSession,
  saveAuthSession,
} from '../auth-session.ts'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:3000'

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  accessToken?: string
  retryOnAuthFailure?: boolean
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 12_000

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    body,
    headers,
    accessToken,
    retryOnAuthFailure = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...init
  } = options
  const token = shouldAutoAttachToken(path)
    ? await resolveAccessToken(accessToken)
    : accessToken
  const { signal, cleanup } = createTimeoutSignal(init.signal, timeoutMs)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw new ApiError('请求超时，请检查网络后重试', 408)
    }
    throw new ApiError('网络连接异常，请稍后重试', 0)
  } finally {
    cleanup()
  }

  if (response.status === 401 && retryOnAuthFailure && shouldAttemptRefresh(path, token)) {
    const refreshed = await refreshAccessTokenOnce()
    if (!refreshed) {
      handleAuthExpired()
      throw new ApiError('登录已过期，请重新登录', 401)
    }

    return apiRequest<T>(path, {
      ...options,
      accessToken: getAccessToken() ?? undefined,
      retryOnAuthFailure: false,
    })
  }

  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as
      | { message?: string | string[] }
      | undefined

    if (!payload?.message) {
      return `Request failed: ${response.status}`
    }

    return Array.isArray(payload.message)
      ? payload.message.join('；')
      : payload.message
  } catch {
    return `Request failed: ${response.status}`
  }
}

function shouldAttemptRefresh(path: string, token: string | undefined): boolean {
  if (!token) return false
  if (
    path.startsWith('/v1/auth/login') ||
    path.startsWith('/v1/auth/register') ||
    path.startsWith('/v1/auth/refresh')
  ) {
    return false
  }
  return true
}

function shouldAutoAttachToken(path: string): boolean {
  return (
    !path.startsWith('/v1/auth/login') &&
    !path.startsWith('/v1/auth/register') &&
    !path.startsWith('/v1/auth/refresh')
  )
}

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessTokenOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const session = getAuthSession()
      if (!session) return false

      try {
        const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        })
        if (!response.ok) return false

        const payload = (await response.json()) as
          | { accessToken?: string; refreshToken?: string }
          | undefined
        if (!payload?.accessToken || !payload.refreshToken) return false

        saveAuthSession({
          ...session,
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
        })
        return true
      } catch {
        return false
      }
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

async function resolveAccessToken(
  explicitToken: string | undefined,
): Promise<string | undefined> {
  if (explicitToken !== undefined) return explicitToken
  return getAccessToken() ?? undefined
}

function handleAuthExpired(): void {
  clearAuthSession()

  if (typeof window !== 'undefined' && window.location.hash !== '#/auth/login') {
    window.location.hash = '#/auth/login'
  }
}

function createTimeoutSignal(
  inputSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, Math.max(1, timeoutMs))

  if (inputSignal) {
    if (inputSignal.aborted) {
      controller.abort()
    } else {
      inputSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}
