import Dexie, { type EntityTable } from 'dexie'

export interface Tap {
  timestamp: number
  windowId: number
}

export interface KickSession {
  id: string
  userId: string
  startedAt: number
  endedAt: number | null
  taps: Tap[]
  kickCount: number
  goalReached: boolean
}

export interface Contraction {
  id: string
  userId: string
  sessionId: string
  startedAt: number
  endedAt: number | null
  duration: number | null // ms
  interval: number | null // ms since previous contraction start
}

export interface ContractionSession {
  id: string
  userId: string
  startedAt: number
  endedAt: number | null
  contractionCount: number
  avgDuration: number | null // ms
  avgInterval: number | null // ms
  alertTriggered: boolean // 5-1-1 rule
}

export interface HospitalBagItem {
  id: string
  userId: string
  category: 'mom' | 'baby' | 'documents'
  name: string
  checked: boolean
  isCustom: boolean
  sortOrder: number
  createdAt: number
}

export type FeedingType = 'breast_left' | 'breast_right' | 'bottle' | 'pump_left' | 'pump_right' | 'pump_both'

export interface FeedingRecord {
  id: string
  userId: string
  type: FeedingType
  startedAt: number
  endedAt: number | null
  duration: number | null // ms, for breast/pump
  volumeMl: number | null // ml, for bottle/pump
  notes: string | null
}

const db = new Dexie('KickCounterDB') as Dexie & {
  sessions: EntityTable<KickSession, 'id'>
  contractionSessions: EntityTable<ContractionSession, 'id'>
  contractions: EntityTable<Contraction, 'id'>
  hospitalBagItems: EntityTable<HospitalBagItem, 'id'>
  feedingRecords: EntityTable<FeedingRecord, 'id'>
}

db.version(1).stores({
  sessions: 'id, startedAt',
})

db.version(2).stores({
  sessions: 'id, startedAt',
  contractionSessions: 'id, startedAt',
  contractions: 'id, sessionId, startedAt',
})

db.version(3).stores({
  sessions: 'id, startedAt',
  contractionSessions: 'id, startedAt',
  contractions: 'id, sessionId, startedAt',
  hospitalBagItems: 'id, category, sortOrder',
})

db.version(4).stores({
  sessions: 'id, startedAt',
  contractionSessions: 'id, startedAt',
  contractions: 'id, sessionId, startedAt',
  hospitalBagItems: 'id, category, sortOrder',
  feedingRecords: 'id, type, startedAt',
})

db.version(5).stores({
  sessions: 'id, userId, [userId+startedAt], startedAt',
  contractionSessions: 'id, userId, [userId+startedAt], startedAt',
  contractions: 'id, userId, sessionId, [userId+sessionId], [userId+startedAt], startedAt',
  hospitalBagItems: 'id, userId, category, [userId+category], [userId+sortOrder], sortOrder',
  feedingRecords: 'id, userId, type, [userId+startedAt], startedAt',
})

db.version(6).stores({
  sessions: 'id, userId, endedAt, [userId+startedAt], [userId+endedAt], startedAt',
  contractionSessions:
    'id, userId, endedAt, [userId+startedAt], [userId+endedAt], startedAt',
  contractions:
    'id, userId, sessionId, [userId+sessionId], [userId+startedAt], startedAt',
  hospitalBagItems:
    'id, userId, category, [userId+category], [userId+sortOrder], sortOrder',
  feedingRecords: 'id, userId, type, [userId+startedAt], startedAt',
})

interface ByStartedAtOptions {
  sinceStartedAt?: number
  beforeStartedAt?: number
  limit?: number
}

function resolveStartedAtBounds(options: ByStartedAtOptions = {}): {
  lowerStartedAt: number
  upperStartedAt: number
} {
  const lowerStartedAt = options.sinceStartedAt ?? Number.MIN_SAFE_INTEGER
  const upperStartedAt =
    options.beforeStartedAt !== undefined
      ? options.beforeStartedAt - 1
      : Number.MAX_SAFE_INTEGER

  return { lowerStartedAt, upperStartedAt }
}

export async function getKickSessionsByUserDesc(
  userId: string,
  options: ByStartedAtOptions = {},
): Promise<KickSession[]> {
  const { lowerStartedAt, upperStartedAt } = resolveStartedAtBounds(options)
  let query = db.sessions
    .where('[userId+startedAt]')
    .between([userId, lowerStartedAt], [userId, upperStartedAt], true, true)
    .reverse()
  if (options.limit !== undefined) {
    query = query.limit(Math.max(1, options.limit))
  }
  return query.toArray()
}

export async function getContractionSessionsByUserDesc(
  userId: string,
  options: ByStartedAtOptions = {},
): Promise<ContractionSession[]> {
  const { lowerStartedAt, upperStartedAt } = resolveStartedAtBounds(options)
  let query = db.contractionSessions
    .where('[userId+startedAt]')
    .between([userId, lowerStartedAt], [userId, upperStartedAt], true, true)
    .reverse()
  if (options.limit !== undefined) {
    query = query.limit(Math.max(1, options.limit))
  }
  return query.toArray()
}

export async function getFeedingRecordsByUserDesc(
  userId: string,
  options: ByStartedAtOptions = {},
): Promise<FeedingRecord[]> {
  const { lowerStartedAt, upperStartedAt } = resolveStartedAtBounds(options)
  let query = db.feedingRecords
    .where('[userId+startedAt]')
    .between([userId, lowerStartedAt], [userId, upperStartedAt], true, true)
    .reverse()
  if (options.limit !== undefined) {
    query = query.limit(Math.max(1, options.limit))
  }
  return query.toArray()
}

export async function getContractionsByUserAndSession(
  userId: string,
  sessionId: string,
): Promise<Contraction[]> {
  return db.contractions
    .where('[userId+sessionId]')
    .equals([userId, sessionId])
    .sortBy('startedAt')
}

export async function getActiveKickSessionByUser(
  userId: string,
): Promise<KickSession | null> {
  const active = await db.sessions
    .where('userId')
    .equals(userId)
    .and(session => session.endedAt === null)
    .first()
  return active ?? null
}

export async function getKickSessionsForDay(
  userId: string,
  timestamp: number,
): Promise<KickSession[]> {
  const dayStart = new Date(timestamp)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = dayStart.getTime() + 86400000 - 1

  return db.sessions
    .where('[userId+startedAt]')
    .between([userId, dayStart.getTime()], [userId, dayEnd], true, true)
    .reverse()
    .toArray()
}

export { db }
