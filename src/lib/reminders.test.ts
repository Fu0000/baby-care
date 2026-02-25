import { beforeEach, describe, expect, it } from 'vitest'
import {
  type ReminderConfig,
  getReminderConfig,
  isWithinQuietHours,
  saveReminderConfig,
} from './reminders.ts'

const baseConfig: ReminderConfig = {
  notificationsEnabled: true,
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '07:00',
  feedingIntervalEnabled: true,
  feedingIntervalMinutes: 180,
  kickEveningEnabled: true,
  kickCheckHour: 20,
  kickMinCount: 4,
  prenatalEnabled: true,
}

describe('reminder helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns defaults when user has no reminder config', () => {
    const config = getReminderConfig('user-empty')
    expect(config).toEqual({
      notificationsEnabled: false,
      quietHoursEnabled: true,
      quietStart: '22:00',
      quietEnd: '07:00',
      feedingIntervalEnabled: true,
      feedingIntervalMinutes: 180,
      kickEveningEnabled: true,
      kickCheckHour: 20,
      kickMinCount: 4,
      prenatalEnabled: true,
    })
  })

  it('normalizes and clamps reminder config when persisting', () => {
    saveReminderConfig(
      {
        ...baseConfig,
        quietStart: '99:88',
        quietEnd: '-1:20',
        feedingIntervalMinutes: 999,
        kickCheckHour: 2,
        kickMinCount: 28,
      },
      'user-a',
    )

    const config = getReminderConfig('user-a')
    expect(config.quietStart).toBe('22:00')
    expect(config.quietEnd).toBe('07:00')
    expect(config.feedingIntervalMinutes).toBe(480)
    expect(config.kickCheckHour).toBe(17)
    expect(config.kickMinCount).toBe(10)
  })

  it('checks quiet hours in same-day window', () => {
    expect(isWithinQuietHours(new Date(2026, 0, 1, 9, 30), '08:00', '12:00')).toBe(true)
    expect(isWithinQuietHours(new Date(2026, 0, 1, 13, 0), '08:00', '12:00')).toBe(false)
  })

  it('checks quiet hours across midnight window', () => {
    expect(isWithinQuietHours(new Date(2026, 0, 1, 23, 30), '22:00', '07:00')).toBe(true)
    expect(isWithinQuietHours(new Date(2026, 0, 2, 6, 45), '22:00', '07:00')).toBe(true)
    expect(isWithinQuietHours(new Date(2026, 0, 2, 14, 0), '22:00', '07:00')).toBe(false)
  })
})
