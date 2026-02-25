import {
  type FeedingRecord,
  getActiveKickSessionByUser,
  getFeedingRecordsByUserDesc,
  getKickSessionsForDay,
} from './db.ts'
import { getCurrentUserId } from './data-scope.ts'
import { getDaysUntilDue, getWeeksPregnant } from './settings.ts'

export type ReminderContentTone = 'info' | 'action' | 'care'
export type ReminderPresetId = 'balanced' | 'night-care' | 'active-track'

export interface ReminderConfig {
  notificationsEnabled: boolean
  quietHoursEnabled: boolean
  quietStart: string
  quietEnd: string
  nightLowStimulus: boolean
  priorityOnlyAtNight: boolean
  contentTone: ReminderContentTone
  feedingIntervalEnabled: boolean
  feedingIntervalMinutes: number
  kickEveningEnabled: boolean
  kickCheckHour: number
  kickMinCount: number
  prenatalEnabled: boolean
  maxNotificationsPerHour: number
  maxNotificationsPerDay: number
}

interface ReminderRuntimeState {
  lastFeedNotifyAt: number | null
  lastKickNotifyDate: string | null
  prenatalMilestones: string[]
  tagNotifyAt: Record<string, number>
  recentNotifyAt: number[]
}

const REMINDER_CONFIG_KEY_PREFIX = 'babycare-reminder-config'
const REMINDER_STATE_KEY_PREFIX = 'babycare-reminder-state'
const GUEST_SCOPE = 'guest'

const defaultReminderConfig: ReminderConfig = {
  notificationsEnabled: false,
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '07:00',
  nightLowStimulus: true,
  priorityOnlyAtNight: true,
  contentTone: 'action',
  feedingIntervalEnabled: true,
  feedingIntervalMinutes: 180,
  kickEveningEnabled: true,
  kickCheckHour: 20,
  kickMinCount: 4,
  prenatalEnabled: true,
  maxNotificationsPerHour: 2,
  maxNotificationsPerDay: 8,
}

const defaultRuntimeState: ReminderRuntimeState = {
  lastFeedNotifyAt: null,
  lastKickNotifyDate: null,
  prenatalMilestones: [],
  tagNotifyAt: {},
  recentNotifyAt: [],
}

export interface ReminderDeliveryPolicy {
  inQuietHours: boolean
  onlyPriority: boolean
  suppressAll: boolean
  shouldUseSilentStyle: boolean
}

export function getReminderPresetPatch(
  preset: ReminderPresetId,
): Partial<ReminderConfig> {
  if (preset === 'night-care') {
    return {
      quietHoursEnabled: true,
      quietStart: '21:30',
      quietEnd: '07:30',
      nightLowStimulus: true,
      priorityOnlyAtNight: true,
      feedingIntervalMinutes: 210,
      kickCheckHour: 21,
      kickMinCount: 4,
      contentTone: 'care',
      maxNotificationsPerHour: 1,
      maxNotificationsPerDay: 5,
    }
  }

  if (preset === 'active-track') {
    return {
      quietHoursEnabled: false,
      nightLowStimulus: false,
      priorityOnlyAtNight: false,
      feedingIntervalMinutes: 150,
      kickCheckHour: 20,
      kickMinCount: 5,
      contentTone: 'action',
      maxNotificationsPerHour: 4,
      maxNotificationsPerDay: 14,
    }
  }

  return {
    quietHoursEnabled: true,
    quietStart: '22:00',
    quietEnd: '07:00',
    nightLowStimulus: true,
    priorityOnlyAtNight: true,
    feedingIntervalMinutes: 180,
    kickCheckHour: 20,
    kickMinCount: 4,
    contentTone: 'action',
    maxNotificationsPerHour: 2,
    maxNotificationsPerDay: 8,
  }
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
    nightLowStimulus: toBoolean(parsed.nightLowStimulus, defaultReminderConfig.nightLowStimulus),
    priorityOnlyAtNight: toBoolean(parsed.priorityOnlyAtNight, defaultReminderConfig.priorityOnlyAtNight),
    contentTone: normalizeContentTone(parsed.contentTone, defaultReminderConfig.contentTone),
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
    maxNotificationsPerHour: clampNumber(
      parsed.maxNotificationsPerHour,
      1,
      8,
      defaultReminderConfig.maxNotificationsPerHour,
    ),
    maxNotificationsPerDay: clampNumber(
      parsed.maxNotificationsPerDay,
      1,
      24,
      defaultReminderConfig.maxNotificationsPerDay,
    ),
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

export function getReminderDeliveryPolicy(
  config: ReminderConfig,
  now: Date,
): ReminderDeliveryPolicy {
  const inQuietHours =
    config.quietHoursEnabled &&
    isWithinQuietHours(now, config.quietStart, config.quietEnd)
  const onlyPriority = inQuietHours && config.nightLowStimulus && config.priorityOnlyAtNight
  const suppressAll = inQuietHours && !onlyPriority
  const shouldUseSilentStyle =
    config.nightLowStimulus &&
    (inQuietHours || now.getHours() >= 21 || now.getHours() < 7)

  return {
    inQuietHours,
    onlyPriority,
    suppressAll,
    shouldUseSilentStyle,
  }
}

export function isReminderTagCoolingDown(
  lastSentAt: number | null | undefined,
  nowTimestamp: number,
  cooldownMs: number,
): boolean {
  if (lastSentAt === null || lastSentAt === undefined) return false
  return nowTimestamp - lastSentAt < Math.max(1, cooldownMs)
}

export function isUnderNotificationQuota(
  config: Pick<ReminderConfig, 'maxNotificationsPerHour' | 'maxNotificationsPerDay'>,
  recentNotifyAt: number[],
  nowTimestamp: number,
): boolean {
  const inOneHour = recentNotifyAt.filter(ts => nowTimestamp - ts <= 3600000).length
  const inOneDay = recentNotifyAt.length
  return (
    inOneHour < config.maxNotificationsPerHour &&
    inOneDay < config.maxNotificationsPerDay
  )
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
  const nowTimestamp = now.getTime()
  const delivery = getReminderDeliveryPolicy(config, now)
  if (delivery.suppressAll) {
    return
  }

  const state = getRuntimeState(userId)
  const today = toDateKey(now)
  let changed = false

  if (config.feedingIntervalEnabled && !delivery.onlyPriority) {
    const feeds = await getFeedingRecordsByUserDesc(userId, { limit: 1 })
    const lastFeed = feeds[0] as FeedingRecord | undefined

    if (lastFeed) {
      const intervalMs = config.feedingIntervalMinutes * 60 * 1000
      const sinceLastFeed = nowTimestamp - lastFeed.startedAt
      const sinceLastNotify = state.lastFeedNotifyAt
        ? nowTimestamp - state.lastFeedNotifyAt
        : Number.POSITIVE_INFINITY
      const cooldownMs = Math.max(intervalMs * 0.9, 45 * 60 * 1000)

      if (
        sinceLastFeed >= intervalMs &&
        sinceLastNotify >= intervalMs * 0.9 &&
        isUnderNotificationQuota(config, state.recentNotifyAt, nowTimestamp) &&
        !isReminderTagCoolingDown(
          state.tagNotifyAt['feeding-interval'],
          nowTimestamp,
          cooldownMs,
        )
      ) {
        sendNotification(
          '喂奶提醒',
          formatReminderBody(
            `距离上次喂奶已超过 ${config.feedingIntervalMinutes} 分钟。`,
            config.contentTone,
            '喂奶',
          ),
          'feeding-interval',
          { silent: delivery.shouldUseSilentStyle },
        )
        state.lastFeedNotifyAt = nowTimestamp
        markReminderSent(state, 'feeding-interval', nowTimestamp)
        changed = true
      }
    }
  }

  if (config.kickEveningEnabled && !delivery.onlyPriority) {
    const weeks = getWeeksPregnant()
    if (weeks !== null && weeks >= 28 && now.getHours() >= config.kickCheckHour) {
      const [todaySessions, activeSession] = await Promise.all([
        getKickSessionsForDay(userId, nowTimestamp),
        getActiveKickSessionByUser(userId),
      ])
      const todayKicks = todaySessions
        .reduce((sum, session) => sum + session.kickCount, 0)
      const isCoolingDown = isReminderTagCoolingDown(
        state.tagNotifyAt['kick-evening'],
        nowTimestamp,
        6 * 60 * 60 * 1000,
      )

      if (
        !activeSession &&
        todayKicks < config.kickMinCount &&
        state.lastKickNotifyDate !== today &&
        isUnderNotificationQuota(config, state.recentNotifyAt, nowTimestamp) &&
        !isCoolingDown
      ) {
        sendNotification(
          '胎动观察提醒',
          formatReminderBody(
            `今日胎动记录偏少（当前 ${todayKicks} 次）。`,
            config.contentTone,
            '胎动',
          ),
          'kick-evening',
          { silent: delivery.shouldUseSilentStyle },
        )
        state.lastKickNotifyDate = today
        markReminderSent(state, 'kick-evening', nowTimestamp)
        changed = true
      }
    }
  }

  if (config.prenatalEnabled) {
    const dueDays = getDaysUntilDue()
    if (dueDays !== null && [14, 7, 3, 1].includes(dueDays)) {
      const token = `${today}:${dueDays}`
      if (!state.prenatalMilestones.includes(token)) {
        const isCoolingDown = isReminderTagCoolingDown(
          state.tagNotifyAt['prenatal-countdown'],
          nowTimestamp,
          20 * 60 * 60 * 1000,
        )
        if (
          !isCoolingDown &&
          isUnderNotificationQuota(config, state.recentNotifyAt, nowTimestamp)
        ) {
          sendNotification(
            '产检与待产提醒',
            formatReminderBody(
              `距离预产期还有 ${dueDays} 天。`,
              config.contentTone,
              '待产',
            ),
            'prenatal-countdown',
            { silent: delivery.shouldUseSilentStyle },
          )
          state.prenatalMilestones = [...state.prenatalMilestones.slice(-9), token]
          markReminderSent(state, 'prenatal-countdown', nowTimestamp)
          changed = true
        }
      }
    }
  }

  if (changed) {
    saveRuntimeState(userId, state)
  }
}

function sendNotification(
  title: string,
  body: string,
  tag: string,
  options?: Pick<NotificationOptions, 'silent'>,
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  new Notification(title, {
    body,
    tag,
    silent: options?.silent,
  })
}

function getReminderConfigFromInput(input: ReminderConfig): ReminderConfig {
  return {
    notificationsEnabled: Boolean(input.notificationsEnabled),
    quietHoursEnabled: Boolean(input.quietHoursEnabled),
    quietStart: normalizeTimeString(input.quietStart, defaultReminderConfig.quietStart),
    quietEnd: normalizeTimeString(input.quietEnd, defaultReminderConfig.quietEnd),
    nightLowStimulus: Boolean(input.nightLowStimulus),
    priorityOnlyAtNight: Boolean(input.priorityOnlyAtNight),
    contentTone: normalizeContentTone(input.contentTone, 'action'),
    feedingIntervalEnabled: Boolean(input.feedingIntervalEnabled),
    feedingIntervalMinutes: clampNumber(input.feedingIntervalMinutes, 60, 480, 180),
    kickEveningEnabled: Boolean(input.kickEveningEnabled),
    kickCheckHour: clampNumber(input.kickCheckHour, 17, 23, 20),
    kickMinCount: clampNumber(input.kickMinCount, 1, 10, 4),
    prenatalEnabled: Boolean(input.prenatalEnabled),
    maxNotificationsPerHour: clampNumber(input.maxNotificationsPerHour, 1, 8, 2),
    maxNotificationsPerDay: clampNumber(input.maxNotificationsPerDay, 1, 24, 8),
  }
}

function getRuntimeState(userId: string): ReminderRuntimeState {
  const parsed = parseJsonObject(localStorage.getItem(getReminderStateKey(userId)))
  if (!parsed) {
    return {
      ...defaultRuntimeState,
      prenatalMilestones: [],
      tagNotifyAt: {},
      recentNotifyAt: [],
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
    tagNotifyAt: normalizeTagNotifyAt(parsed.tagNotifyAt),
    recentNotifyAt: normalizeRecentNotifyAt(parsed.recentNotifyAt),
  }
}

function saveRuntimeState(userId: string, state: ReminderRuntimeState): void {
  localStorage.setItem(getReminderStateKey(userId), JSON.stringify(state))
}

function markReminderSent(
  state: ReminderRuntimeState,
  tag: string,
  nowTimestamp: number,
): void {
  const nextMap = {
    ...state.tagNotifyAt,
    [tag]: nowTimestamp,
  }
  const cutoff = nowTimestamp - 14 * 86400000
  for (const [key, timestamp] of Object.entries(nextMap)) {
    if (timestamp < cutoff) {
      delete nextMap[key]
    }
  }
  state.tagNotifyAt = nextMap
  state.recentNotifyAt = [...state.recentNotifyAt, nowTimestamp].filter(
    timestamp => timestamp >= nowTimestamp - 86400000,
  )
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

function normalizeTagNotifyAt(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const input = value as Record<string, unknown>
  const normalized: Record<string, number> = {}
  for (const [key, val] of Object.entries(input)) {
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      normalized[key] = val
    }
  }
  return normalized
}

function normalizeRecentNotifyAt(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    .filter(item => item > 0)
    .slice(-50)
}

function parseTimeToMinutes(time: string): number {
  const [hourString, minuteString] = normalizeTimeString(time, '00:00').split(':')
  const hour = Number(hourString)
  const minute = Number(minuteString)
  return hour * 60 + minute
}

function normalizeContentTone(
  value: unknown,
  fallback: ReminderContentTone,
): ReminderContentTone {
  if (value === 'info' || value === 'action' || value === 'care') return value
  return fallback
}

function formatReminderBody(
  base: string,
  tone: ReminderContentTone,
  subject: '喂奶' | '胎动' | '待产',
): string {
  if (tone === 'info') {
    if (subject === '喂奶') return `${base}请按需查看宝宝状态。`
    if (subject === '胎动') return `${base}请按需安排一次复测。`
    return `${base}建议核对清单与安排。`
  }

  if (tone === 'care') {
    if (subject === '喂奶') return `${base}辛苦了，先补充水分，再观察宝宝是否需要喂养。`
    if (subject === '胎动') return `${base}你可以先侧卧放松，安静观察一会儿。`
    return `${base}保持节奏，提前准备会让你更安心。`
  }

  if (subject === '喂奶') return `${base}建议现在安排一次喂奶并记录。`
  if (subject === '胎动') return `${base}建议现在安静侧卧并进行一次胎动复测。`
  return `${base}建议现在检查待产包与就医路线。`
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}
