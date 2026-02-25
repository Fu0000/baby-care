import { db } from './db.ts'
import { getSettings } from './settings.ts'
import { apiRequest } from './api/client.ts'
import { getAccessToken } from './auth.ts'
import { getCurrentUserId } from './data-scope.ts'

const MIGRATION_DONE_KEY = 'babycare-cloud-bootstrap-done'

export function isCloudMigrationDone(): boolean {
  const userId = getCurrentUserId()
  if (!userId) return false
  return localStorage.getItem(getMigrationDoneKey(userId)) === '1'
}

export async function migrateLocalDataIfNeeded(): Promise<void> {
  const token = getAccessToken()
  const userId = getCurrentUserId()
  if (!token || !userId || isCloudMigrationDone()) return

  const [sessions, contractionSessions, contractions, hospitalBagItems, feedingRecords] =
    await Promise.all([
      db.sessions.where('userId').equals(userId).toArray(),
      db.contractionSessions.where('userId').equals(userId).toArray(),
      db.contractions.where('userId').equals(userId).toArray(),
      db.hospitalBagItems.where('userId').equals(userId).toArray(),
      db.feedingRecords.where('userId').equals(userId).toArray(),
    ])
  const { goalCount, mergeWindowMinutes, dueDate } = getSettings()

  await apiRequest<{ uploadedAt: string }>('/v1/sync/bootstrap', {
    method: 'POST',
    accessToken: token,
    body: {
      settings: { goalCount, mergeWindowMinutes, dueDate },
      sessions,
      contractionSessions,
      contractions,
      hospitalBagItems,
      feedingRecords,
    },
  })

  localStorage.setItem(getMigrationDoneKey(userId), '1')
}

function getMigrationDoneKey(userId: string): string {
  return `${MIGRATION_DONE_KEY}:${userId}`
}
