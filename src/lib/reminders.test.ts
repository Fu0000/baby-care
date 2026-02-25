import { beforeEach, describe, expect, it } from 'vitest'
import {
  type ReminderConfig,
  getReminderPresetPatch,
  getReminderDeliveryPolicy,
  getReminderConfig,
  isUnderNotificationQuota,
  isReminderTagCoolingDown,
  isWithinQuietHours,
  saveReminderConfig,
} from './reminders.ts'

const baseConfig: ReminderConfig = {
  notificationsEnabled: true,
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '07:00',
  nightLowStimulus: true,
  priorityOnlyAtNight: true,
  contentTone: 'action',
  feedingIntervalEnabled: true,
  feedingIntervalMinutes: 180,
  kickEveningEnabled: true,
  kickCheckHour: 20,
  kickMinCount: 4,
  prenatalEnabled: true,
  maxNotificationsPerHour: 2,
  maxNotificationsPerDay: 8,
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
      nightLowStimulus: true,
      priorityOnlyAtNight: true,
      contentTone: 'action',
      feedingIntervalEnabled: true,
      feedingIntervalMinutes: 180,
      kickEveningEnabled: true,
      kickCheckHour: 20,
      kickMinCount: 4,
      prenatalEnabled: true,
      maxNotificationsPerHour: 2,
      maxNotificationsPerDay: 8,
    })
  })

  it('normalizes and clamps reminder config when persisting', () => {
    saveReminderConfig(
      {
        ...baseConfig,
        quietStart: '99:88',
        quietEnd: '-1:20',
        contentTone: 'invalid' as ReminderConfig['contentTone'],
        feedingIntervalMinutes: 999,
        kickCheckHour: 2,
        kickMinCount: 28,
        maxNotificationsPerHour: 99,
        maxNotificationsPerDay: -1,
      },
      'user-a',
    )

    const config = getReminderConfig('user-a')
    expect(config.quietStart).toBe('22:00')
    expect(config.quietEnd).toBe('07:00')
    expect(config.contentTone).toBe('action')
    expect(config.feedingIntervalMinutes).toBe(480)
    expect(config.kickCheckHour).toBe(17)
    expect(config.kickMinCount).toBe(10)
    expect(config.maxNotificationsPerHour).toBe(8)
    expect(config.maxNotificationsPerDay).toBe(1)
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

  it('resolves quiet policy with priority-only at night', () => {
    const policy = getReminderDeliveryPolicy(
      {
        ...baseConfig,
        quietHoursEnabled: true,
        nightLowStimulus: true,
        priorityOnlyAtNight: true,
      },
      new Date(2026, 0, 1, 23, 30),
    )

    expect(policy.inQuietHours).toBe(true)
    expect(policy.onlyPriority).toBe(true)
    expect(policy.suppressAll).toBe(false)
    expect(policy.shouldUseSilentStyle).toBe(true)
  })

  it('suppresses all reminders in quiet hours when priority-only is off', () => {
    const policy = getReminderDeliveryPolicy(
      {
        ...baseConfig,
        quietHoursEnabled: true,
        nightLowStimulus: false,
        priorityOnlyAtNight: false,
      },
      new Date(2026, 0, 1, 23, 30),
    )

    expect(policy.inQuietHours).toBe(true)
    expect(policy.onlyPriority).toBe(false)
    expect(policy.suppressAll).toBe(true)
  })

  it('checks reminder tag cooldown window', () => {
    const now = Date.now()
    expect(isReminderTagCoolingDown(now - 2 * 60_000, now, 5 * 60_000)).toBe(true)
    expect(isReminderTagCoolingDown(now - 8 * 60_000, now, 5 * 60_000)).toBe(false)
    expect(isReminderTagCoolingDown(null, now, 5 * 60_000)).toBe(false)
  })

  it('enforces global notification quota', () => {
    const now = Date.now()
    const config: Pick<ReminderConfig, 'maxNotificationsPerHour' | 'maxNotificationsPerDay'> = {
      maxNotificationsPerHour: 2,
      maxNotificationsPerDay: 4,
    }
    expect(
      isUnderNotificationQuota(config, [now - 10 * 60_000, now - 30 * 60_000], now),
    ).toBe(false)
    expect(
      isUnderNotificationQuota(config, [now - 10 * 60_000, now - 2 * 3600_000], now),
    ).toBe(true)
  })

  it('provides preset patches for different reminder scenes', () => {
    const balanced = getReminderPresetPatch('balanced')
    const nightCare = getReminderPresetPatch('night-care')
    const active = getReminderPresetPatch('active-track')

    expect(balanced.quietHoursEnabled).toBe(true)
    expect(balanced.maxNotificationsPerHour).toBe(2)
    expect(balanced.maxNotificationsPerDay).toBe(8)
    expect(nightCare.maxNotificationsPerHour).toBe(1)
    expect(nightCare.contentTone).toBe('care')
    expect(active.quietHoursEnabled).toBe(false)
    expect(active.priorityOnlyAtNight).toBe(false)
    expect(active.maxNotificationsPerHour).toBe(4)
    expect(active.maxNotificationsPerDay).toBeGreaterThan(
      nightCare.maxNotificationsPerDay ?? 0,
    )
  })
})
