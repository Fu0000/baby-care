import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import ProgressRing from './ProgressRing.tsx'

describe('ProgressRing', () => {
  it('renders ring with expected SVG dash offset', () => {
    const { container } = render(<ProgressRing progress={0.5} size={100} strokeWidth={10} />)
    const circles = container.querySelectorAll('circle')

    expect(circles).toHaveLength(2)

    const radius = (100 - 10) / 2
    const circumference = radius * 2 * Math.PI
    const expectedOffset = circumference / 2

    expect(circles[1]?.getAttribute('stroke-dasharray')).toBe(String(circumference))
    expect(Number(circles[1]?.getAttribute('stroke-dashoffset'))).toBeCloseTo(expectedOffset)
  })
})
