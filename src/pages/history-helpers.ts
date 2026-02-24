import type { KickSession } from '../lib/db.ts'
import { isSameDay } from '../lib/time.ts'

export interface TimelineEvent {
  time: number
  type: 'kick' | 'window'
  label: string
}

export function getTimeline(session: KickSession): TimelineEvent[] {
  const events: TimelineEvent[] = []
  let lastWindowId = -1
  let kickNum = 0

  for (const tap of session.taps) {
    if (tap.windowId !== lastWindowId) {
      kickNum++
      lastWindowId = tap.windowId
      events.push({
        time: tap.timestamp,
        type: 'kick',
        label: `第 ${kickNum} 次有效胎动`,
      })
    } else {
      events.push({
        time: tap.timestamp,
        type: 'window',
        label: '窗口内追加点击',
      })
    }
  }

  return events
}

export function getChartPoints(sessions: KickSession[], days: number): { time: number; value: number }[] {
  const points: { time: number; value: number }[] = []
  const now = Date.now()
  const dayMs = 86400000

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * dayMs
    const kicks = sessions
      .filter((session) => isSameDay(session.startedAt, dayStart))
      .reduce((sum, session) => sum + session.kickCount, 0)

    points.push({ time: Math.floor(dayStart / 1000), value: kicks })
  }

  return points
}
