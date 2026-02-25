import type { UserStage } from './settings.ts'

export type ParentChildGameMode = 'chase' | 'rhythm'
export type ParentChildMusicProfileId = 'lullaby' | 'playful' | 'focus'

export interface ParentChildRecommendation {
  title: string
  subtitle: string
  gameMode: ParentChildGameMode
  musicProfile: ParentChildMusicProfileId
  durationSeconds: number
  dailyTargetMinutes: number
  dailyTargetSessions: number
}

export interface ParentChildSessionRecord {
  startedAt: number
  endedAt: number
  plannedSeconds: number
  actualSeconds: number
  completed: boolean
  mode: ParentChildGameMode
  musicProfile: ParentChildMusicProfileId
  score: number
  maxCombo: number
}

export interface ParentChildSessionRecordInput {
  startedAt: number
  plannedSeconds: number
  actualSeconds: number
  completed: boolean
  mode: ParentChildGameMode
  musicProfile: ParentChildMusicProfileId
  score: number
  maxCombo: number
  endedAt?: number
}

export interface ParentChildDailyStats {
  totalSessions: number
  completedSessions: number
  completionRate: number
  totalDurationSeconds: number
  averageDurationSeconds: number
}

export interface ParentChildRecentStats {
  days: number
  totalSessions: number
  completedSessions: number
  completionRate: number
  totalDurationSeconds: number
}

const STORAGE_KEY_PREFIX = 'babycare-parent-child-play-sessions'
const GUEST_SCOPE = 'guest'
const MAX_RECORDS = 500

export function getParentChildRecommendation(
  stage: UserStage,
  lowStimulus: boolean,
): ParentChildRecommendation {
  if (stage === 'newborn_3_12m') {
    if (lowStimulus) {
      return {
        title: '3-12月低刺激节奏',
        subtitle: '优先稳定节拍和短时互动，逐步增加强度。',
        gameMode: 'rhythm',
        musicProfile: 'focus',
        durationSeconds: 30,
        dailyTargetMinutes: 8,
        dailyTargetSessions: 3,
      }
    }

    return {
      title: '3-12月活力探索',
      subtitle: '追光+节奏交替，提升注意力与手眼协调。',
      gameMode: 'chase',
      musicProfile: 'playful',
      durationSeconds: 45,
      dailyTargetMinutes: 12,
      dailyTargetSessions: 4,
    }
  }

  if (stage === 'newborn_0_3m') {
    return {
      title: '0-3月安抚互动',
      subtitle: '短时、慢节奏，以观察宝宝状态为优先。',
      gameMode: 'rhythm',
      musicProfile: 'lullaby',
      durationSeconds: lowStimulus ? 20 : 30,
      dailyTargetMinutes: 6,
      dailyTargetSessions: 3,
    }
  }

  return {
    title: '孕晚期胎教互动',
    subtitle: '轻音乐+视觉卡片，保持稳定、不过度刺激。',
    gameMode: 'rhythm',
    musicProfile: 'lullaby',
    durationSeconds: 20,
    dailyTargetMinutes: 5,
    dailyTargetSessions: 2,
  }
}

export function getParentChildSessions(userId?: string | null): ParentChildSessionRecord[] {
  const raw = localStorage.getItem(getStorageKey(userId))
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .map(normalizeRecord)
      .filter((item): item is ParentChildSessionRecord => item !== null)
      .sort((a, b) => b.startedAt - a.startedAt)
  } catch {
    return []
  }
}

export function recordParentChildSession(
  input: ParentChildSessionRecordInput,
  userId?: string | null,
): void {
  const normalized = normalizeRecord(input)
  if (!normalized) return

  const list = getParentChildSessions(userId)
  const merged = [normalized, ...list]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_RECORDS)

  localStorage.setItem(getStorageKey(userId), JSON.stringify(merged))
}

export function getParentChildDailyStats(
  userId?: string | null,
  nowTs = Date.now(),
): ParentChildDailyStats {
  const [dayStart, dayEnd] = getDayBounds(nowTs)
  const today = getParentChildSessions(userId).filter(
    (item) => item.startedAt >= dayStart && item.startedAt < dayEnd,
  )

  return summarizeStats(today)
}

export function getParentChildRecentStats(
  userId?: string | null,
  days = 7,
  nowTs = Date.now(),
): ParentChildRecentStats {
  const safeDays = Math.max(1, Math.min(30, Math.round(days)))
  const [dayStart] = getDayBounds(nowTs)
  const rangeStart = dayStart - (safeDays - 1) * 86400000

  const recent = getParentChildSessions(userId).filter(
    (item) => item.startedAt >= rangeStart && item.startedAt < dayStart + 86400000,
  )
  const stats = summarizeStats(recent)

  return {
    days: safeDays,
    totalSessions: stats.totalSessions,
    completedSessions: stats.completedSessions,
    completionRate: stats.completionRate,
    totalDurationSeconds: stats.totalDurationSeconds,
  }
}

function summarizeStats(list: ParentChildSessionRecord[]): ParentChildDailyStats {
  const totalSessions = list.length
  const completedSessions = list.filter((item) => item.completed).length
  const totalDurationSeconds = list.reduce(
    (sum, item) => sum + item.actualSeconds,
    0,
  )

  return {
    totalSessions,
    completedSessions,
    completionRate:
      totalSessions === 0 ? 0 : Math.round((completedSessions / totalSessions) * 100),
    totalDurationSeconds,
    averageDurationSeconds:
      totalSessions === 0 ? 0 : Math.round(totalDurationSeconds / totalSessions),
  }
}

function normalizeRecord(raw: unknown): ParentChildSessionRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>

  const startedAt = toFinite(item.startedAt)
  const endedAtRaw = toFinite(item.endedAt)
  const plannedSeconds = clampSeconds(item.plannedSeconds)
  const actualSeconds = clampSeconds(item.actualSeconds)
  const score = toNonNegativeInteger(item.score)
  const maxCombo = toNonNegativeInteger(item.maxCombo)
  const completed = typeof item.completed === 'boolean' ? item.completed : false
  const mode = normalizeMode(item.mode)
  const musicProfile = normalizeMusic(item.musicProfile)

  if (startedAt === null) return null
  const endedAt = endedAtRaw ?? startedAt

  return {
    startedAt,
    endedAt: Math.max(endedAt, startedAt),
    plannedSeconds,
    actualSeconds: Math.min(actualSeconds, Math.max(plannedSeconds * 2, 1)),
    completed,
    mode,
    musicProfile,
    score,
    maxCombo,
  }
}

function normalizeMode(value: unknown): ParentChildGameMode {
  return value === 'rhythm' ? 'rhythm' : 'chase'
}

function normalizeMusic(value: unknown): ParentChildMusicProfileId {
  if (value === 'lullaby' || value === 'playful' || value === 'focus') {
    return value
  }
  return 'lullaby'
}

function clampSeconds(value: unknown): number {
  const parsed = toFinite(value)
  if (parsed === null) return 1
  return Math.max(1, Math.min(7200, Math.round(parsed)))
}

function toFinite(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

function toNonNegativeInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value))
}

function getDayBounds(ts: number): [number, number] {
  const day = new Date(ts)
  day.setHours(0, 0, 0, 0)
  const dayStart = day.getTime()
  return [dayStart, dayStart + 86400000]
}

function getStorageKey(userId?: string | null): string {
  return `${STORAGE_KEY_PREFIX}:${userId ?? GUEST_SCOPE}`
}
