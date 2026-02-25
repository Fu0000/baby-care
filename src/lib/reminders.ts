import { db, type FeedingRecord, type KickSession } from './db.ts'
import { getCurrentUserId } from './data-scope.ts'
import { getDaysUntilDue, getWeeksPregnant } from './settings.ts'

export interface ReminderConfig {
  notificationsEnabled: boolean
  quietHoursEnabled: boolean
  quietStart: string
  quietEnd: string
  feedingIntervalEnabled: boolean
  feedingIntervalMinutes: number
  kickEveningEnabled: boolean
  kickCheckHour: number
  kickMinCount: number
  prenatalEnabled: boolean
}

interface ReminderRuntimeState {
  lastFeedNotifyAt: number | null
  lastKickNotifyDate: string | null
  prenatalMilestones: string[]
}

const REMINDER_CONFIG_KEY_PREFIX = 'babycare-reminder-config'
const REMINDER_STATE_KEY_PREFIX = 'babycare-reminder-state'
const GUEST_SCOPE = 'guest'

const defaultReminderConfig: ReminderConfig = {
  notificationsEnabled: false,
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '07:00',
  feedingIntervalEnabled: true,
  feedingIntervalMinutes: 180,
  kickEveningEnabled: true,
  kickCheckHour: 20,
  kickMinCount: 4,
  prenatalEnabled: true,
}

const defaultRuntimeState: ReminderRuntimeState = {
  lastFeedNotifyAt: null,
  lastKickNotifyDate: null,
  prenatalMilestones: [],
}

export function getReminderConfig(userId?: string | null): ReminderConfig {
  const targetUserId = userId ?? getCurrentUserId() ?? GUEST_SCOPE
  const parsed = parseJsonObject(localStorage.getItem(getReminderConfigKey(targetUserId)))
  if (!parsed) return { ...defaultReminderConfig }

  return {
    notificationsEnabled: toBoolean(parsed.notificationsEnabled, defaultReminderConfig.notificationsEnabled),
    quietHoursEnabled: toBoolean(parsed.quietHoursEnabled, defaultReminderConfig.quietHoursEnabled),
    quietStart: normalizeTimeString(parsed.quietStart, defaultReminderConfig.quietStart),
    quietEnd: normalizeTimeString(parsed.quietEnd, defaultReminderConfig.quietEnd),
    feedingIntervalEnabled: toBoolean(parsed.feedingIntervalEnabled, defaultReminderConfig.feedingIntervalEnabled),
    feedingIntervalMinutes: clampNumber(
      parsed.feedingIntervalMinutes,
      60,
      480,
      defaultReminderConfig.feedingIntervalMinutes,
    ),
    kickEveningEnabled: toBoolean(parsed.kickEveningEnabled, defaultReminderConfig.kickEveningEnabled),
    kickCheckHour: clampNumber(parsed.kickCheckHour, 17, 23, defaultReminderConfig.kickCheckHour),
    kickMinCount: clampNumber(parsed.kickMinCount, 1, 10, defaultReminderConfig.kickMinCount),
    prenatalEnabled: toBoolean(parsed.prenatalEnabled, defaultReminderConfig.prenatalEnabled),
  }
}

export function saveReminderConfig(config: ReminderConfig, userId?: string | null): void {
  const targetUserId = userId ?? getCurrentUserId() ?? GUEST_SCOPE
  const normalized = getReminderConfigFromInput(config)
  localStorage.setItem(getReminderConfigKey(targetUserId), JSON.stringify(normalized))
}

export function getNotificationPermissionStatus():
  | NotificationPermission
  | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

export async function requestNotificationPermission():
  Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.requestPermission()
}

export function isWithinQuietHours(
  now: Date,
  quietStart: string,
  quietEnd: string,
): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const start = parseTimeToMinutes(quietStart)
  const end = parseTimeToMinutes(quietEnd)

  if (start === end) return false
  if (start < end) {
    return nowMinutes >= start && nowMinutes < end
  }

  return nowMinutes >= start || nowMinutes < end
}

export function startReminderEngine(): () => void {
  if (typeof window === 'undefined') return () => undefined

  let timer: number | null = null

  const runTick = () => {
    void tickReminderEngine().catch(() => undefined)
  }

  runTick()
  timer = window.setInterval(runTick, 60 * 1000)

  return () => {
    if (timer !== null) {
      window.clearInterval(timer)
    }
  }
}

async function tickReminderEngine(): Promise<void> {
  const userId = getCurrentUserId()
  if (!userId) return

  const config = getReminderConfig(userId)
  if (!config.notificationsEnabled) return

  const permission = getNotificationPermissionStatus()
  if (permission !== 'granted') return

  const now = new Date()
  if (
    config.quietHoursEnabled &&
    isWithinQuietHours(now, config.quietStart, config.quietEnd)
  ) {
    return
  }

  const state = getRuntimeState(userId)
  const today = toDateKey(now)
  let changed = false

  if (config.feedingIntervalEnabled) {
    const feeds: FeedingRecord[] = await db.feedingRecords.where('userId').equals(userId).toArray()
    feeds.sort((a, b) => b.startedAt - a.startedAt)
    const lastFeed = feeds[0]

    if (lastFeed) {
      const intervalMs = config.feedingIntervalMinutes * 60 * 1000
      const sinceLastFeed = now.getTime() - lastFeed.startedAt
      const sinceLastNotify = state.lastFeedNotifyAt
        ? now.getTime() - state.lastFeedNotifyAt
        : Number.POSITIVE_INFINITY

      if (sinceLastFeed >= intervalMs && sinceLastNotify >= intervalMs * 0.9) {
        sendNotification(
          '喂奶提醒',
          `距离上次喂奶已超过 ${config.feedingIntervalMinutes} 分钟，可考虑观察宝宝状态。`,
          'feeding-interval',
        )
        state.lastFeedNotifyAt = now.getTime()
        changed = true
      }
    }
  }

  if (config.kickEveningEnabled) {
    const weeks = getWeeksPregnant()
    if (weeks !== null && weeks >= 28 && now.getHours() >= config.kickCheckHour) {
      const sessions: KickSession[] = await db.sessions.where('userId').equals(userId).toArray()
      const todayKicks = sessions
        .filter((session) => isSameDay(session.startedAt, now.getTime()))
        .reduce((sum, session) => sum + session.kickCount, 0)
      const activeSession = sessions.some((session) => session.endedAt === null)

      if (!activeSession && todayKicks < config.kickMinCount && state.lastKickNotifyDate !== today) {
        sendNotification(
          '胎动观察提醒',
          `今日胎动记录偏少（当前 ${todayKicks} 次），建议安静侧卧再观察一次。`,
          'kick-evening',
        )
        state.lastKickNotifyDate = today
        changed = true
      }
    }
  }

  if (config.prenatalEnabled) {
    const dueDays = getDaysUntilDue()
    if (dueDays !== null && [14, 7, 3, 1].includes(dueDays)) {
      const token = `${today}:${dueDays}`
      if (!state.prenatalMilestones.includes(token)) {
        sendNotification(
          '产检与待产提醒',
          `距离预产期还有 ${dueDays} 天，建议检查待产包与就医路线安排。`,
          'prenatal-countdown',
        )
        state.prenatalMilestones = [...state.prenatalMilestones.slice(-9), token]
        changed = true
      }
    }
  }

  if (changed) {
    saveRuntimeState(userId, state)
  }
}

function sendNotification(title: string, body: string, tag: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  new Notification(title, { body, tag })
}

function getReminderConfigFromInput(input: ReminderConfig): ReminderConfig {
  return {
    notificationsEnabled: Boolean(input.notificationsEnabled),
    quietHoursEnabled: Boolean(input.quietHoursEnabled),
    quietStart: normalizeTimeString(input.quietStart, defaultReminderConfig.quietStart),
    quietEnd: normalizeTimeString(input.quietEnd, defaultReminderConfig.quietEnd),
    feedingIntervalEnabled: Boolean(input.feedingIntervalEnabled),
    feedingIntervalMinutes: clampNumber(input.feedingIntervalMinutes, 60, 480, 180),
    kickEveningEnabled: Boolean(input.kickEveningEnabled),
    kickCheckHour: clampNumber(input.kickCheckHour, 17, 23, 20),
    kickMinCount: clampNumber(input.kickMinCount, 1, 10, 4),
    prenatalEnabled: Boolean(input.prenatalEnabled),
  }
}

function getRuntimeState(userId: string): ReminderRuntimeState {
  const parsed = parseJsonObject(localStorage.getItem(getReminderStateKey(userId)))
  if (!parsed) {
    return {
      ...defaultRuntimeState,
      prenatalMilestones: [],
    }
  }

  return {
    lastFeedNotifyAt:
      typeof parsed.lastFeedNotifyAt === 'number' ? parsed.lastFeedNotifyAt : null,
    lastKickNotifyDate:
      typeof parsed.lastKickNotifyDate === 'string' ? parsed.lastKickNotifyDate : null,
    prenatalMilestones: Array.isArray(parsed.prenatalMilestones)
      ? parsed.prenatalMilestones.filter(
          (entry): entry is string => typeof entry === 'string',
        )
      : [],
  }
}

function saveRuntimeState(userId: string, state: ReminderRuntimeState): void {
  localStorage.setItem(getReminderStateKey(userId), JSON.stringify(state))
}

function getReminderConfigKey(userId: string): string {
  return `${REMINDER_CONFIG_KEY_PREFIX}:${userId}`
}

function getReminderStateKey(userId: string): string {
  return `${REMINDER_STATE_KEY_PREFIX}:${userId}`
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function normalizeTimeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return fallback
  const [hourString, minuteString] = trimmed.split(':')
  const hour = Number(hourString)
  const minute = Number(minuteString)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== 'boolean') return fallback
  return value
}

function parseTimeToMinutes(time: string): number {
  const [hourString, minuteString] = normalizeTimeString(time, '00:00').split(':')
  const hour = Number(hourString)
  const minute = Number(minuteString)
  return hour * 60 + minute
}

function isSameDay(timestamp: number, nowTimestamp: number): boolean {
  const date = new Date(timestamp)
  const now = new Date(nowTimestamp)
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}
