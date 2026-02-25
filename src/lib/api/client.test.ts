import { beforeEach, describe, expect, it, vi } from 'vitest'

function setAuthSession(accessToken = 'old-access', refreshToken = 'old-refresh'): void {
  localStorage.setItem(
    'babycare-auth-session',
    JSON.stringify({
      accessToken,
      refreshToken,
      user: {
        id: 'user-1',
        phone: '13800000000',
        nickname: null,
        inviteBound: true,
      },
    }),
  )
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

async function loadClientModule() {
  vi.resetModules()
  return import('./client.ts')
}

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    window.location.hash = '#/'
  })

  it('refreshes token on 401 and retries original request once', async () => {
    setAuthSession()

    const fetchMock = vi
      .fn<[input: string, init?: RequestInit], Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' }, 200),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200))

    vi.stubGlobal('fetch', fetchMock)
    const { apiRequest } = await loadClientModule()

    const payload = await apiRequest<{ ok: boolean }>('/v1/protected', {
      method: 'GET',
      accessToken: 'old-access',
    })

    expect(payload.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const refreshedSession = JSON.parse(localStorage.getItem('babycare-auth-session') ?? '{}')
    expect(refreshedSession.accessToken).toBe('new-access')
    expect(refreshedSession.refreshToken).toBe('new-refresh')

    const thirdCall = fetchMock.mock.calls[2]
    const thirdCallHeaders = (thirdCall?.[1]?.headers ?? {}) as Record<string, string>
    expect(thirdCallHeaders.Authorization).toBe('Bearer new-access')
  })

  it('clears auth and redirects to login when refresh fails', async () => {
    setAuthSession()
    window.location.hash = '#/history'

    const fetchMock = vi
      .fn<[input: string, init?: RequestInit], Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: 'refresh failed' }, 401))

    vi.stubGlobal('fetch', fetchMock)
    const { apiRequest } = await loadClientModule()

    await expect(
      apiRequest('/v1/protected', {
        method: 'GET',
        accessToken: 'old-access',
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: '登录已过期，请重新登录',
    })

    expect(localStorage.getItem('babycare-auth-session')).toBeNull()
    expect(window.location.hash).toBe('#/auth/login')
  })

  it('does not attempt refresh on auth login endpoint', async () => {
    const fetchMock = vi
      .fn<[input: string, init?: RequestInit], Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ message: 'invalid credentials' }, 401))

    vi.stubGlobal('fetch', fetchMock)
    const { apiRequest } = await loadClientModule()

    await expect(
      apiRequest('/v1/auth/login', {
        method: 'POST',
        body: { phone: '13800000000', password: 'bad-password' },
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'invalid credentials',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
