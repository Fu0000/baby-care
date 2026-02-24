import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getChartPoints, getTimeline } from './history-helpers.ts'
import type { KickSession } from '../lib/db.ts'

function makeKickSession(overrides: Partial<KickSession> = {}): KickSession {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    startedAt: now,
    endedAt: now,
    taps: [],
    kickCount: 0,
    goalReached: false,
    ...overrides,
  }
}

describe('History helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-24T10:00:00.000Z'))
  })

  it('builds a timeline that distinguishes effective kicks and merged-window taps', () => {
    const timeline = getTimeline(makeKickSession({
      taps: [
        { timestamp: 1000, windowId: 1 },
        { timestamp: 2000, windowId: 1 },
        { timestamp: 3000, windowId: 2 },
      ],
    }))

    expect(timeline).toEqual([
      { time: 1000, type: 'kick', label: '第 1 次有效胎动' },
      { time: 2000, type: 'window', label: '窗口内追加点击' },
      { time: 3000, type: 'kick', label: '第 2 次有效胎动' },
    ])
  })

  it('produces day-by-day chart points with kick aggregation', () => {
    const now = Date.now()
    const sessions: KickSession[] = [
      makeKickSession({ startedAt: now, kickCount: 2 }),
      makeKickSession({ startedAt: now - 86400000, kickCount: 3 }),
      makeKickSession({ startedAt: now - 86400000 + 2 * 3600000, kickCount: 1 }),
    ]

    const points = getChartPoints(sessions, 2)

    expect(points).toHaveLength(2)
    expect(points.map((p) => p.value)).toEqual([4, 2])
  })
})
