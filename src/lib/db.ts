import Dexie, { type EntityTable } from 'dexie'

export interface Tap {
  timestamp: number
  windowId: number
}

export interface KickSession {
  id: string
  startedAt: number
  endedAt: number | null
  taps: Tap[]
  kickCount: number
  goalReached: boolean
}

export interface Contraction {
  id: string
  sessionId: string
  startedAt: number
  endedAt: number | null
  duration: number | null // ms
  interval: number | null // ms since previous contraction start
}

export interface ContractionSession {
  id: string
  startedAt: number
  endedAt: number | null
  contractionCount: number
  avgDuration: number | null // ms
  avgInterval: number | null // ms
  alertTriggered: boolean // 5-1-1 rule
}

export interface HospitalBagItem {
  id: string
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

export { db }
