import { beforeEach, describe, expect, it } from 'vitest'
import {
  createEmptyHomeDashboardSnapshot,
  getHomeLayoutPrefs,
  saveHomeLayoutPrefs,
} from './home-dashboard.ts'

describe('home dashboard helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('builds empty snapshot with stage-aware tasks', () => {
    const snapshot = createEmptyHomeDashboardSnapshot({
      goalCount: 10,
      userStage: 'pregnancy_late',
      remindersEnabled: true,
    })

    expect(snapshot.totalTasks).toBe(3)
    expect(snapshot.completedTasks).toBe(1)
    expect(snapshot.completionRate).toBe(33)
    expect(snapshot.tasks.some((task) => task.id === 'kick_goal')).toBe(true)
  })

  it('auto-expands secondary insights on first open each day', () => {
    const dayOneMorning = new Date(2026, 1, 26, 8, 0, 0).getTime()
    const dayTwoMorning = new Date(2026, 1, 27, 8, 0, 0).getTime()

    const first = getHomeLayoutPrefs(dayOneMorning)
    expect(first.secondaryInsightsCollapsed).toBe(false)

    saveHomeLayoutPrefs({ secondaryInsightsCollapsed: true }, dayOneMorning)
    const sameDay = getHomeLayoutPrefs(dayOneMorning)
    expect(sameDay.secondaryInsightsCollapsed).toBe(true)

    const nextDay = getHomeLayoutPrefs(dayTwoMorning)
    expect(nextDay.secondaryInsightsCollapsed).toBe(false)
  })
})
