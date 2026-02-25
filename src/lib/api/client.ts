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
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, accessToken, retryOnAuthFailure = true, ...init } = options
  const token = shouldAutoAttachToken(path)
    ? await resolveAccessToken(accessToken)
    : accessToken

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401 && retryOnAuthFailure && shouldAttemptRefresh(path, token)) {
    const refreshed = await refreshAccessTokenOnce()
    if (!refreshed) {
      await handleAuthExpired()
      throw new ApiError('登录已过期，请重新登录', 401)
    }

    const { getAccessToken } = await import('../auth.ts')
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
      try {
        const { refreshSession } = await import('../auth.ts')
        await refreshSession()
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
  const { getAccessToken } = await import('../auth.ts')
  return getAccessToken() ?? undefined
}

async function handleAuthExpired(): Promise<void> {
  const { clearAuthSession } = await import('../auth.ts')
  clearAuthSession()

  if (typeof window !== 'undefined' && window.location.hash !== '#/auth/login') {
    window.location.hash = '#/auth/login'
  }
}
