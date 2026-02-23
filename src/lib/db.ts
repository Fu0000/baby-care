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

const db = new Dexie('KickCounterDB') as Dexie & {
  sessions: EntityTable<KickSession, 'id'>
}

db.version(1).stores({
  sessions: 'id, startedAt',
})

export { db }
