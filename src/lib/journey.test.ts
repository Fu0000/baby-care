import { describe, expect, it } from 'vitest'
import { getDailyRhythmCard, getJourneyCard, getKickSafetyNotice } from './journey.ts'

describe('journey helpers', () => {
  it('returns newborn journey card when stage is newborn', () => {
    const card = getJourneyCard(null, null, 'newborn_0_3m')
    expect(card.title).toContain('新生儿')
    expect(card.tasks.length).toBeGreaterThanOrEqual(3)
  })

  it('returns rhythm card aligned with stage and hour', () => {
    const nightCard = getDailyRhythmCard('newborn_0_3m', 23)
    const dayCard = getDailyRhythmCard('pregnancy_late', 10)

    expect(nightCard.title).toContain('夜间')
    expect(dayCard.title).toContain('今日')
  })

  it('skips kick safety notice for non-pregnancy stage', () => {
    const notice = getKickSafetyNotice({
      userStage: 'newborn_3_12m',
      weeksPregnant: 39,
      todayKicks: 0,
      goalCount: 10,
      currentHour: 22,
      activeKickSession: false,
    })

    expect(notice).toBeNull()
  })
})
