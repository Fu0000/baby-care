import { beforeEach, describe, expect, it } from 'vitest'
import { trackToolOpen } from './tool-usage.ts'
import { getAdaptiveTools, getEntryTools, getGroupedEntryTools } from './tools.tsx'

describe('adaptive tools', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('prioritizes feeding in newborn night scenario', () => {
    const tools = getAdaptiveTools({
      userStage: 'newborn_0_3m',
      hour: 23,
      weeksPregnant: 35,
      daysUntilDue: 20,
    })

    expect(tools[0]?.id).toBe('feeding-log')
  })

  it('prioritizes contraction timer after due date', () => {
    const tools = getAdaptiveTools({
      userStage: 'pregnancy_late',
      hour: 10,
      weeksPregnant: 40,
      daysUntilDue: -1,
    })

    expect(tools[0]?.id).toBe('contraction-timer')
  })

  it('boosts tool position with strong recent usage', () => {
    for (let i = 0; i < 30; i += 1) {
      trackToolOpen('parent-child-play', Date.now() - i * 1000)
    }

    const tools = getAdaptiveTools({
      userStage: 'newborn_3_12m',
      hour: 14,
      weeksPregnant: 35,
      daysUntilDue: 30,
    })

    expect(tools[0]?.id).toBe('parent-child-play')
  })

  it('returns quick entry tools with recent usage boosted', () => {
    trackToolOpen('reminders', Date.now() - 1000)
    trackToolOpen('reminders', Date.now() - 2000)

    const quick = getEntryTools(
      {
        userStage: 'pregnancy_late',
        hour: 9,
        weeksPregnant: 33,
        daysUntilDue: 35,
      },
      { limit: 4, includeRecent: true },
    )

    expect(quick).toHaveLength(4)
    expect(quick[0]?.id).toBe('reminders')
  })

  it('groups ranked tools by scenario buckets', () => {
    const grouped = getGroupedEntryTools(
      {
        userStage: 'newborn_3_12m',
        hour: 10,
        weeksPregnant: 35,
        daysUntilDue: 10,
      },
      { includeRecent: false },
    )

    expect(grouped.groups.length).toBeGreaterThan(0)
    expect(grouped.groups.some((group) => group.id === 'pregnancy-records')).toBe(true)
    expect(grouped.groups.some((group) => group.id === 'newborn-care')).toBe(true)
  })
})
