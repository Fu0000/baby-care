import { beforeEach, describe, expect, it } from 'vitest'
import {
  getParentChildDailyStats,
  getParentChildRecommendation,
  getParentChildRecentStats,
  getParentChildSessions,
  recordParentChildSession,
} from './parent-child-play.ts'

describe('parent-child-play helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns stage-based recommendation for newborn 0-3m', () => {
    const plan = getParentChildRecommendation('newborn_0_3m', false)

    expect(plan.gameMode).toBe('rhythm')
    expect(plan.musicProfile).toBe('lullaby')
    expect(plan.dailyTargetSessions).toBeGreaterThan(1)
  })

  it('returns low-stimulus recommendation for newborn 3-12m', () => {
    const plan = getParentChildRecommendation('newborn_3_12m', true)

    expect(plan.gameMode).toBe('rhythm')
    expect(plan.musicProfile).toBe('focus')
    expect(plan.durationSeconds).toBeLessThanOrEqual(30)
  })

  it('records sessions by user scope and computes daily stats', () => {
    const now = new Date(2026, 1, 25, 12, 0, 0).getTime()

    recordParentChildSession(
      {
        startedAt: now - 120_000,
        endedAt: now,
        plannedSeconds: 30,
        actualSeconds: 30,
        completed: true,
        mode: 'chase',
        musicProfile: 'playful',
        score: 18,
        maxCombo: 6,
      },
      'user-a',
    )

    recordParentChildSession(
      {
        startedAt: now - 300_000,
        endedAt: now - 240_000,
        plannedSeconds: 45,
        actualSeconds: 20,
        completed: false,
        mode: 'rhythm',
        musicProfile: 'focus',
        score: 7,
        maxCombo: 2,
      },
      'user-a',
    )

    recordParentChildSession(
      {
        startedAt: now - 180_000,
        endedAt: now,
        plannedSeconds: 20,
        actualSeconds: 20,
        completed: true,
        mode: 'rhythm',
        musicProfile: 'lullaby',
        score: 10,
        maxCombo: 3,
      },
      'user-b',
    )

    const stats = getParentChildDailyStats('user-a', now)
    expect(stats.totalSessions).toBe(2)
    expect(stats.completedSessions).toBe(1)
    expect(stats.completionRate).toBe(50)
    expect(stats.totalDurationSeconds).toBe(50)

    expect(getParentChildDailyStats('user-b', now).totalSessions).toBe(1)
  })

  it('computes recent stats window and sorts sessions desc', () => {
    const day = new Date(2026, 1, 25, 10, 0, 0).getTime()

    recordParentChildSession(
      {
        startedAt: day,
        plannedSeconds: 30,
        actualSeconds: 30,
        completed: true,
        mode: 'chase',
        musicProfile: 'playful',
        score: 12,
        maxCombo: 4,
      },
      'user-a',
    )

    recordParentChildSession(
      {
        startedAt: day - 2 * 86400000,
        plannedSeconds: 30,
        actualSeconds: 30,
        completed: true,
        mode: 'rhythm',
        musicProfile: 'lullaby',
        score: 9,
        maxCombo: 3,
      },
      'user-a',
    )

    const recent = getParentChildRecentStats('user-a', 2, day)
    expect(recent.days).toBe(2)
    expect(recent.totalSessions).toBe(1)

    const sessions = getParentChildSessions('user-a')
    expect(sessions[0]?.startedAt).toBeGreaterThan(sessions[1]?.startedAt ?? 0)
  })
})
