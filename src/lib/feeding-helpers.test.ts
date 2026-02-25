import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatFeedingDuration,
  formatTimeSinceLastFeed,
  getFeedingBgColor,
  getFeedingColor,
  getFeedingEmoji,
  getFeedingLabel,
  getFeedingShortLabel,
  getOppositeSide,
  getTodaySummary,
  isBreastType,
  isPumpType,
  suggestBreastSide,
  suggestPumpSide,
} from './feeding-helpers.ts'
import type { FeedingRecord, FeedingType } from './db.ts'

function makeRecord(type: FeedingType, overrides: Partial<FeedingRecord> = {}): FeedingRecord {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    userId: 'test-user-1',
    type,
    startedAt: now,
    endedAt: now,
    duration: null,
    volumeMl: null,
    notes: null,
    ...overrides,
  }
}

describe('feeding helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-24T10:00:00.000Z'))
  })

  it('maps feeding labels and short labels', () => {
    expect(getFeedingLabel('breast_left')).toBe('亲喂·左侧')
    expect(getFeedingLabel('breast_right')).toBe('亲喂·右侧')
    expect(getFeedingLabel('bottle')).toBe('奶瓶')
    expect(getFeedingLabel('pump_left')).toBe('吸奶·左侧')
    expect(getFeedingLabel('pump_right')).toBe('吸奶·右侧')
    expect(getFeedingLabel('pump_both')).toBe('吸奶·双侧')

    expect(getFeedingShortLabel('breast_left')).toBe('左侧亲喂')
    expect(getFeedingShortLabel('pump_both')).toBe('双侧吸奶')
  })

  it('maps emoji and theme classes by feeding type', () => {
    expect(getFeedingEmoji('bottle')).toBe('🍼')
    expect(getFeedingEmoji('pump_left')).toBe('🧴')
    expect(getFeedingEmoji('breast_left')).toBe('🤱')

    expect(getFeedingColor('bottle')).toBe('text-duo-blue')
    expect(getFeedingColor('pump_right')).toBe('text-duo-orange')
    expect(getFeedingColor('breast_right')).toBe('text-duo-purple')

    expect(getFeedingBgColor('bottle')).toBe('bg-duo-blue')
    expect(getFeedingBgColor('pump_both')).toBe('bg-duo-orange')
    expect(getFeedingBgColor('breast_left')).toBe('bg-duo-purple')
  })

  it('detects breast and pump types', () => {
    expect(isBreastType('breast_left')).toBe(true)
    expect(isBreastType('pump_left')).toBe(false)

    expect(isPumpType('pump_both')).toBe(true)
    expect(isPumpType('bottle')).toBe(false)
  })

  it('returns opposite breast side only for breast feeds', () => {
    expect(getOppositeSide('breast_left')).toBe('breast_right')
    expect(getOppositeSide('breast_right')).toBe('breast_left')
    expect(getOppositeSide('bottle')).toBeNull()
  })

  it('suggests next breast side from most recent breast record', () => {
    expect(suggestBreastSide([])).toBe('breast_left')

    const records: FeedingRecord[] = [
      makeRecord('breast_left'),
      makeRecord('bottle'),
      makeRecord('breast_right'),
    ]
    expect(suggestBreastSide(records)).toBe('breast_right')
  })

  it('suggests next pump side from most recent pump record', () => {
    expect(suggestPumpSide([])).toBe('pump_both')
    expect(suggestPumpSide([makeRecord('pump_left')])).toBe('pump_right')
    expect(suggestPumpSide([makeRecord('pump_right')])).toBe('pump_left')
    expect(suggestPumpSide([makeRecord('pump_both')])).toBe('pump_both')
  })

  it('formats time since last feed', () => {
    const now = Date.now()
    expect(formatTimeSinceLastFeed(now - 30000)).toBe('刚刚')
    expect(formatTimeSinceLastFeed(now - 17 * 60000)).toBe('17分钟')
    expect(formatTimeSinceLastFeed(now - 2 * 3600000)).toBe('2小时')
    expect(formatTimeSinceLastFeed(now - (2 * 3600000 + 5 * 60000))).toBe('2小时5分')
  })

  it('formats feeding duration in chinese units', () => {
    expect(formatFeedingDuration(45000)).toBe('45秒')
    expect(formatFeedingDuration(120000)).toBe('2分钟')
    expect(formatFeedingDuration(125000)).toBe('2分5秒')
  })

  it('computes daily feeding summary from records', () => {
    const records: FeedingRecord[] = [
      makeRecord('breast_left', { duration: 60000 }),
      makeRecord('breast_right', { duration: 61000 }),
      makeRecord('bottle', { volumeMl: 80 }),
      makeRecord('pump_both', { volumeMl: 100 }),
    ]

    expect(getTodaySummary(records)).toEqual({
      totalCount: 4,
      breastCount: 2,
      bottleCount: 1,
      pumpCount: 1,
      totalVolumeMl: 180,
      totalBreastMinutes: 2,
    })
  })
})
