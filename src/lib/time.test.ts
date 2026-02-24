import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatShortDuration,
  formatTime,
  isSameDay,
} from './time.ts'

describe('time utilities', () => {
  it('formats full duration as hh:mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00:00')
    expect(formatDuration(3661000)).toBe('01:01:01')
  })

  it('formats short duration as m:ss', () => {
    expect(formatShortDuration(125000)).toBe('2:05')
    expect(formatShortDuration(59000)).toBe('0:59')
  })

  it('formats local date and time', () => {
    const ts = new Date(2026, 0, 5, 9, 7, 0).getTime()
    expect(formatDate(ts)).toBe('2026/01/05')
    expect(formatTime(ts)).toBe('09:07')
    expect(formatDateTime(ts)).toBe('2026/01/05 09:07')
  })

  it('detects same calendar day', () => {
    const morning = new Date(2026, 2, 12, 8, 0, 0).getTime()
    const evening = new Date(2026, 2, 12, 22, 30, 0).getTime()
    const nextDay = new Date(2026, 2, 13, 0, 1, 0).getTime()

    expect(isSameDay(morning, evening)).toBe(true)
    expect(isSameDay(morning, nextDay)).toBe(false)
  })
})
