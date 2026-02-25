import { db } from './db.ts'
import { getSettings } from './settings.ts'
import { apiRequest } from './api/client.ts'
import { getAccessToken } from './auth.ts'

const MIGRATION_DONE_KEY = 'babycare-cloud-bootstrap-done'

export function isCloudMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_DONE_KEY) === '1'
}

export async function migrateLocalDataIfNeeded(): Promise<void> {
  if (isCloudMigrationDone()) return

  const token = getAccessToken()
  if (!token) return

  const [sessions, contractionSessions, contractions, hospitalBagItems, feedingRecords] =
    await Promise.all([
      db.sessions.toArray(),
      db.contractionSessions.toArray(),
      db.contractions.toArray(),
      db.hospitalBagItems.toArray(),
      db.feedingRecords.toArray(),
    ])

  await apiRequest<{ uploadedAt: string }>('/v1/sync/bootstrap', {
    method: 'POST',
    accessToken: token,
    body: {
      settings: getSettings(),
      sessions,
      contractionSessions,
      contractions,
      hospitalBagItems,
      feedingRecords,
    },
  })

  localStorage.setItem(MIGRATION_DONE_KEY, '1')
}
