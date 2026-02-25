import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BottleEntry from './BottleEntry.tsx'
import { db } from '../../../lib/db.ts'

const { mockNavigate, mockSuccess, mockError } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
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

vi.mock('sileo', () => ({
  sileo: {
    success: mockSuccess,
    error: mockError,
  },
}))

describe('BottleEntry', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockSuccess.mockReset()
    mockError.mockReset()
    mockLoggedInUser()
  })

  it('saves bottle record and returns to feeding home', async () => {
    const user = userEvent.setup()
    render(<BottleEntry />)

    await user.click(screen.getByRole('button', { name: '记录完成' }))

    await waitFor(async () => {
      const records = await db.feedingRecords.toArray()
      expect(records).toHaveLength(1)
      expect(records[0]?.userId).toBe(TEST_USER_ID)
      expect(records[0]?.type).toBe('bottle')
      expect(records[0]?.volumeMl).toBe(60)
      expect(records[0]?.endedAt).toBe(records[0]?.startedAt)
    })

    expect(mockSuccess).toHaveBeenCalledWith({ title: '已记录', description: '奶瓶 60ml' })
    expect(mockNavigate).toHaveBeenCalledWith('/tools/feeding-log', { replace: true })
  })

  it('shows error and does not save when volume is invalid', async () => {
    const user = userEvent.setup()
    render(<BottleEntry />)

    const volumeInput = screen.getByRole('textbox')
    await user.clear(volumeInput)
    await user.type(volumeInput, '0')

    await user.click(screen.getByRole('button', { name: '记录完成' }))

    expect(mockError).toHaveBeenCalledWith({ title: '请输入奶量' })
    expect(await db.feedingRecords.count()).toBe(0)
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
