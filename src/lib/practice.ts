const PRACTICE_STARTED_AT_KEY_PREFIX = 'babycare-practice-started-at'

export function ensurePracticeStartedAt(
  userId: string,
  fallbackCreatedAtIso?: string | null,
  nowTs = Date.now(),
): number {
  if (typeof window === 'undefined') return nowTs

  const key = `${PRACTICE_STARTED_AT_KEY_PREFIX}:${userId}`
  const raw = window.localStorage.getItem(key)
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed > 0) return parsed

  let fallback = nowTs
  if (fallbackCreatedAtIso) {
    const isoTs = Date.parse(fallbackCreatedAtIso)
    if (Number.isFinite(isoTs)) fallback = isoTs
  }

  window.localStorage.setItem(key, String(fallback))
  return fallback
}

export function getPracticeDayNumber(startedAtTs: number, nowTs = Date.now()): number {
  if (!Number.isFinite(startedAtTs) || startedAtTs <= 0) return 1
  const startDay = startOfLocalDay(startedAtTs)
  const today = startOfLocalDay(nowTs)
  const diffDays = Math.floor((today - startDay) / 86400000)
  return Math.max(1, diffDays + 1)
}

function startOfLocalDay(ts: number): number {
  const day = new Date(ts)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

