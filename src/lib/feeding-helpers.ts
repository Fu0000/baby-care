import type { FeedingType, FeedingRecord } from './db.ts'

export function getFeedingLabel(type: FeedingType): string {
  switch (type) {
    case 'breast_left': return '亲喂·左侧'
    case 'breast_right': return '亲喂·右侧'
    case 'bottle': return '奶瓶'
    case 'pump_left': return '吸奶·左侧'
    case 'pump_right': return '吸奶·右侧'
    case 'pump_both': return '吸奶·双侧'
  }
}

export function getFeedingShortLabel(type: FeedingType): string {
  switch (type) {
    case 'breast_left': return '左侧亲喂'
    case 'breast_right': return '右侧亲喂'
    case 'bottle': return '奶瓶'
    case 'pump_left': return '左侧吸奶'
    case 'pump_right': return '右侧吸奶'
    case 'pump_both': return '双侧吸奶'
  }
}

export function getFeedingEmoji(type: FeedingType): string {
  if (type === 'bottle') return '🍼'
  if (type.startsWith('pump')) return '🧴'
  return '🤱'
}

export function getFeedingColor(type: FeedingType): string {
  if (type === 'bottle') return 'text-duo-blue'
  if (type.startsWith('pump')) return 'text-duo-orange'
  return 'text-duo-purple'
}

export function getFeedingBgColor(type: FeedingType): string {
  if (type === 'bottle') return 'bg-duo-blue'
  if (type.startsWith('pump')) return 'bg-duo-orange'
  return 'bg-duo-purple'
}

export function isBreastType(type: FeedingType): boolean {
  return type === 'breast_left' || type === 'breast_right'
}

export function isPumpType(type: FeedingType): boolean {
  return type === 'pump_left' || type === 'pump_right' || type === 'pump_both'
}

export function getOppositeSide(type: FeedingType): FeedingType | null {
  if (type === 'breast_left') return 'breast_right'
  if (type === 'breast_right') return 'breast_left'
  return null
}

/** Suggest which side to feed next based on the last breast feeding */
export function suggestBreastSide(records: FeedingRecord[]): 'breast_left' | 'breast_right' {
  const lastBreast = records.find(r => isBreastType(r.type))
  if (!lastBreast) return 'breast_left'
  return lastBreast.type === 'breast_left' ? 'breast_right' : 'breast_left'
}

/** Suggest which side to pump next based on the last pump record */
export function suggestPumpSide(records: FeedingRecord[]): FeedingType {
  const lastPump = records.find(r => isPumpType(r.type))
  if (!lastPump || lastPump.type === 'pump_both') return 'pump_both'
  return lastPump.type === 'pump_left' ? 'pump_right' : 'pump_left'
}

/** Format time since last feed as a human-readable string */
export function formatTimeSinceLastFeed(lastFeedAt: number): string {
  const diff = Date.now() - lastFeedAt
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  if (remainMinutes === 0) return `${hours}小时`
  return `${hours}小时${remainMinutes}分`
}

/** Format ms duration for display (e.g. "5分30秒") */
export function formatFeedingDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}秒`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}分${sec}秒` : `${m}分钟`
}

/** Get today's feeding summary */
export function getTodaySummary(records: FeedingRecord[]): {
  totalCount: number
  breastCount: number
  bottleCount: number
  pumpCount: number
  totalVolumeMl: number
  totalBreastMinutes: number
} {
  let breastCount = 0
  let bottleCount = 0
  let pumpCount = 0
  let totalVolumeMl = 0
  let totalBreastMs = 0

  for (const r of records) {
    if (isBreastType(r.type)) {
      breastCount++
      if (r.duration) totalBreastMs += r.duration
    } else if (r.type === 'bottle') {
      bottleCount++
    } else {
      pumpCount++
    }
    if (r.volumeMl) totalVolumeMl += r.volumeMl
  }

  return {
    totalCount: records.length,
    breastCount,
    bottleCount,
    pumpCount,
    totalVolumeMl,
    totalBreastMinutes: Math.round(totalBreastMs / 60000),
  }
}
