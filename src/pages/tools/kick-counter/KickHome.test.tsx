import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KickHome from './KickHome.tsx'
import { db } from '../../../lib/db.ts'

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))
const TEST_USER_ID = 'test-user-1'

function mockLoggedInUser() {
  localStorage.setItem(
    'babycare-auth-session',
    JSON.stringify({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: {
        id: TEST_USER_ID,
        phone: '13800000000',
        nickname: '测试用户',
        inviteBound: true,
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    }),
  )
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('KickHome', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    mockLoggedInUser()
  })

  it('starts a new kick session and navigates to session page', async () => {
    const user = userEvent.setup()
    render(<KickHome />)

    await user.click(await screen.findByRole('button', { name: /开始数胎动/ }))

    await waitFor(async () => {
      const sessions = await db.sessions.toArray()
      expect(sessions).toHaveLength(1)
      expect(sessions[0]?.userId).toBe(TEST_USER_ID)
      expect(sessions[0]?.endedAt).toBeNull()
      expect(sessions[0]?.kickCount).toBe(0)
    })

    expect(mockNavigate).toHaveBeenCalledTimes(1)
    const [path] = mockNavigate.mock.calls[0] as [string]
    expect(path).toMatch(/^\/tools\/kick-counter\/session\//)
  })

  it('shows and resumes active session', async () => {
    const user = userEvent.setup()
    const sessionId = crypto.randomUUID()

    await db.sessions.put({
      id: sessionId,
      userId: TEST_USER_ID,
      startedAt: Date.now(),
      endedAt: null,
      taps: [],
      kickCount: 3,
      goalReached: false,
    })

    render(<KickHome />)

    const resumeButton = await screen.findByRole('button', { name: /继续记录 \(3 次胎动\)/ })
    await user.click(resumeButton)

    expect(mockNavigate).toHaveBeenCalledWith(`/tools/kick-counter/session/${sessionId}`)
  })

  it('deletes an existing today session after confirmation', async () => {
    const user = userEvent.setup()
    const sessionId = crypto.randomUUID()

    await db.sessions.put({
      id: sessionId,
      userId: TEST_USER_ID,
      startedAt: Date.now(),
      endedAt: Date.now() + 300000,
      taps: [{ timestamp: Date.now(), windowId: 1 }],
      kickCount: 1,
      goalReached: false,
    })

    render(<KickHome />)

    const deleteButtons = await screen.findAllByRole('button', { name: '✕' })
    await user.click(deleteButtons[0])
    await user.click(await screen.findByRole('button', { name: '删除' }))

    await waitFor(async () => {
      expect(await db.sessions.count()).toBe(0)
    })
  })
})
