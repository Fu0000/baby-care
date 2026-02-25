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
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, accessToken, ...init } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

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
