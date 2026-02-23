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

const db = new Dexie('KickCounterDB') as Dexie & {
  sessions: EntityTable<KickSession, 'id'>
  contractionSessions: EntityTable<ContractionSession, 'id'>
  contractions: EntityTable<Contraction, 'id'>
}

db.version(1).stores({
  sessions: 'id, startedAt',
})

db.version(2).stores({
  sessions: 'id, startedAt',
  contractionSessions: 'id, startedAt',
  contractions: 'id, sessionId, startedAt',
})

export { db }
