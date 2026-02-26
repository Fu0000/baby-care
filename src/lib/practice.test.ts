import { describe, expect, it, vi } from 'vitest'
import { getPracticeDayNumber } from './practice.ts'

describe('practice', () => {
  it('returns 1 for invalid startedAt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-26T10:00:00.000Z'))
    expect(getPracticeDayNumber(Number.NaN)).toBe(1)
    expect(getPracticeDayNumber(0)).toBe(1)
    vi.useRealTimers()
  })

  it('counts first day as 1', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-26T10:00:00.000Z'))
    const startedAt = new Date('2026-02-26T01:00:00.000Z').getTime()
    expect(getPracticeDayNumber(startedAt)).toBe(1)
    vi.useRealTimers()
  })

  it('increments by local calendar day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-26T10:00:00.000Z'))
    const startedAt = new Date('2026-02-24T12:00:00.000Z').getTime()
    expect(getPracticeDayNumber(startedAt)).toBe(3)
    vi.useRealTimers()
  })
})
