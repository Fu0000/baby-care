import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TipBanner from './TipBanner.tsx'

vi.mock('../lib/tips.ts', () => ({
  getRandomTip: vi.fn(() => '测试提示'),
}))

describe('TipBanner', () => {
  it('renders when random threshold is met and can be dismissed', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const user = userEvent.setup()

    render(<TipBanner />)

    expect(await screen.findByText('测试提示')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByText('测试提示')).not.toBeInTheDocument()
  })

  it('does not render when random threshold is not met', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)

    render(<TipBanner />)

    expect(screen.queryByText('你知道吗？')).not.toBeInTheDocument()
  })
})
