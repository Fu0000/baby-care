import { describe, expect, it } from 'vitest'
import { getJourneyCard, getKickSafetyNotice } from './journey.ts'

describe('journey helpers', () => {
  it('returns onboarding journey when pregnancy info is missing', () => {
    const card = getJourneyCard(null, null)
    expect(card.title).toContain('建立你的陪伴节奏')
    expect(card.tasks.length).toBeGreaterThan(0)
  })

  it('returns labor-focused journey after due date', () => {
    const card = getJourneyCard(39, -1)
    expect(card.title).toContain('临产准备周')
    expect(card.tone).toBe('orange')
  })

  it('warns for late-day low kicks in third trimester', () => {
    const notice = getKickSafetyNotice({
      weeksPregnant: 33,
      todayKicks: 1,
      goalCount: 10,
      currentHour: 21,
      activeKickSession: false,
    })
    expect(notice?.level).toBe('warn')
  })

  it('returns info when there is an active kick session', () => {
    const notice = getKickSafetyNotice({
      weeksPregnant: 35,
      todayKicks: 0,
      goalCount: 10,
      currentHour: 22,
      activeKickSession: true,
    })
    expect(notice?.level).toBe('info')
  })
})
