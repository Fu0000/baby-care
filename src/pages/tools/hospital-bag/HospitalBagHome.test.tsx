import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HospitalBagHome from './HospitalBagHome.tsx'
import { db } from '../../../lib/db.ts'

const { mockNavigate, mockConfetti } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockConfetti: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('canvas-confetti', () => ({
  default: mockConfetti,
}))

vi.mock('sileo', () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('HospitalBagHome', () => {
  beforeEach(async () => {
    mockNavigate.mockReset()
    mockConfetti.mockReset()
    await db.hospitalBagItems.clear()
  })

  it('seeds preset items on first load', async () => {
    render(<HospitalBagHome />)

    expect(await screen.findByText('0/30 已准备')).toBeInTheDocument()
    expect(await db.hospitalBagItems.count()).toBe(30)
  })

  it('updates progress when toggling an item', async () => {
    const user = userEvent.setup()
    render(<HospitalBagHome />)

    const checkboxes = await screen.findAllByRole('checkbox')
    await user.click(checkboxes[0])

    await waitFor(() => {
      expect(screen.getByText('1/30 已准备')).toBeInTheDocument()
    })

    const first = await db.hospitalBagItems.orderBy('sortOrder').first()
    expect(first?.checked).toBe(true)
  })

  it('adds a custom item in the expanded category', async () => {
    const user = userEvent.setup()
    render(<HospitalBagHome />)

    const input = await screen.findByPlaceholderText('添加自定义物品...')
    await user.type(input, '婴儿连体衣')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('婴儿连体衣')).toBeInTheDocument()

    const customItems = await db.hospitalBagItems.filter((item) => item.isCustom).toArray()
    expect(customItems.some((item) => item.name === '婴儿连体衣')).toBe(true)
  })
})
