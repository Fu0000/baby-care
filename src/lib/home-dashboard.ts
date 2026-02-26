import type { KickSession } from './db.ts'
import {
  getActiveKickSessionByUser,
  getContractionSessionsByUserDesc,
  getFeedingRecordsByUserDesc,
  getKickSessionsByUserDesc,
  getKickSessionsForDay,
} from './db.ts'
import { getParentChildDailyStats } from './parent-child-play.ts'
import type { UserStage } from './settings.ts'

const HOME_LAYOUT_PREFS_KEY = 'babycare-home-layout-preferences'

export interface HomeDashboardInput {
  goalCount: number
  userStage: UserStage
  remindersEnabled: boolean
  now?: number
}

export interface HomeTaskItem {
  id: string
  label: string
  completed: boolean
}

export interface HomeDashboardSnapshot {
  todayKicks: number
  todayFeeds: number
  todayContractions: number
  todayInteractions: number
  todayInteractionSeconds: number
  lastFeedAt: number | null
  streak: number
  activeKickSession: KickSession | null
  completionRate: number
  completedTasks: number
  totalTasks: number
  tasks: HomeTaskItem[]
}

export interface HomeLayoutPrefs {
  secondaryInsightsCollapsed: boolean
  lastSeenDate: string
}

export async function getHomeDashboardSnapshot(
  userId: string | null,
  input: HomeDashboardInput,
): Promise<HomeDashboardSnapshot> {
  const now = input.now ?? Date.now()
  if (!userId) {
    return buildSnapshot({
      input,
      todayKicks: 0,
      todayFeeds: 0,
      todayContractions: 0,
      todayInteractions: 0,
      todayInteractionSeconds: 0,
      lastFeedAt: null,
      streak: 0,
      activeKickSession: null,
    })
  }

  const [dayStart, dayEndExclusive] = getDayBounds(now)
  const dayMs = 86400000

  const [
    sessionsForStreak,
    sessionsToday,
    activeKickSession,
    latestFeeds,
    feedsToday,
    contractionsToday,
  ] = await Promise.all([
    getKickSessionsByUserDesc(userId, {
      sinceStartedAt: now - dayMs * 370,
    }),
    getKickSessionsForDay(userId, now),
    getActiveKickSessionByUser(userId),
    getFeedingRecordsByUserDesc(userId, { limit: 1 }),
    getFeedingRecordsByUserDesc(userId, {
      sinceStartedAt: dayStart,
      beforeStartedAt: dayEndExclusive,
    }),
    getContractionSessionsByUserDesc(userId, {
      sinceStartedAt: dayStart,
      beforeStartedAt: dayEndExclusive,
    }),
  ])

  const todayKicks = sessionsToday.reduce((sum, session) => sum + session.kickCount, 0)
  const interactionStats = getParentChildDailyStats(userId, now)
  const todayInteractions = interactionStats.totalSessions

  return buildSnapshot({
    input,
    todayKicks,
    todayFeeds: feedsToday.length,
    todayContractions: contractionsToday.length,
    todayInteractions,
    todayInteractionSeconds: interactionStats.totalDurationSeconds,
    lastFeedAt: latestFeeds[0]?.startedAt ?? null,
    streak: getKickStreakDays(sessionsForStreak, now),
    activeKickSession,
  })
}

export function createEmptyHomeDashboardSnapshot(
  input: Pick<HomeDashboardInput, 'goalCount' | 'userStage' | 'remindersEnabled'>,
): HomeDashboardSnapshot {
  return buildSnapshot({
    input,
    todayKicks: 0,
    todayFeeds: 0,
    todayContractions: 0,
    todayInteractions: 0,
    todayInteractionSeconds: 0,
    lastFeedAt: null,
    streak: 0,
    activeKickSession: null,
  })
}

export function getHomeLayoutPrefs(now = Date.now()): HomeLayoutPrefs {
  const today = getDayKey(now)
  const raw = readHomeLayoutPrefsRaw()

  if (raw.lastSeenDate !== today) {
    const next: HomeLayoutPrefs = {
      secondaryInsightsCollapsed: false,
      lastSeenDate: today,
    }
    localStorage.setItem(HOME_LAYOUT_PREFS_KEY, JSON.stringify(next))
    return next
  }

  return raw
}

export function saveHomeLayoutPrefs(
  patch: Partial<Omit<HomeLayoutPrefs, 'lastSeenDate'>>,
  now = Date.now(),
): HomeLayoutPrefs {
  const current = getHomeLayoutPrefs(now)
  const next: HomeLayoutPrefs = {
    ...current,
    ...patch,
    lastSeenDate: getDayKey(now),
  }
  localStorage.setItem(HOME_LAYOUT_PREFS_KEY, JSON.stringify(next))
  return next
}

function readHomeLayoutPrefsRaw(): HomeLayoutPrefs {
  const fallback: HomeLayoutPrefs = {
    secondaryInsightsCollapsed: true,
    lastSeenDate: '',
  }

  const raw = localStorage.getItem(HOME_LAYOUT_PREFS_KEY)
  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return fallback
    const item = parsed as Record<string, unknown>

    return {
      secondaryInsightsCollapsed:
        typeof item.secondaryInsightsCollapsed === 'boolean'
          ? item.secondaryInsightsCollapsed
          : fallback.secondaryInsightsCollapsed,
      lastSeenDate:
        typeof item.lastSeenDate === 'string' ? item.lastSeenDate : fallback.lastSeenDate,
    }
  } catch {
    return fallback
  }
}

function buildSnapshot(input: {
  input: Pick<HomeDashboardInput, 'goalCount' | 'userStage' | 'remindersEnabled'>
  todayKicks: number
  todayFeeds: number
  todayContractions: number
  todayInteractions: number
  todayInteractionSeconds: number
  lastFeedAt: number | null
  streak: number
  activeKickSession: KickSession | null
}): HomeDashboardSnapshot {
  const tasks = resolveTasks({
    userStage: input.input.userStage,
    goalCount: input.input.goalCount,
    remindersEnabled: input.input.remindersEnabled,
    todayKicks: input.todayKicks,
    todayFeeds: input.todayFeeds,
    todayInteractions: input.todayInteractions,
  })
  const completedTasks = tasks.filter((task) => task.completed).length
  const completionRate =
    tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100)

  return {
    todayKicks: input.todayKicks,
    todayFeeds: input.todayFeeds,
    todayContractions: input.todayContractions,
    todayInteractions: input.todayInteractions,
    todayInteractionSeconds: input.todayInteractionSeconds,
    lastFeedAt: input.lastFeedAt,
    streak: input.streak,
    activeKickSession: input.activeKickSession,
    completionRate,
    completedTasks,
    totalTasks: tasks.length,
    tasks,
  }
}

function resolveTasks(input: {
  userStage: UserStage
  goalCount: number
  remindersEnabled: boolean
  todayKicks: number
  todayFeeds: number
  todayInteractions: number
}): HomeTaskItem[] {
  if (input.userStage === 'pregnancy_late') {
    return [
      {
        id: 'kick_started',
        label: '已开启胎动记录',
        completed: input.todayKicks > 0,
      },
      {
        id: 'kick_goal',
        label: '胎动达到今日目标',
        completed: input.todayKicks >= Math.max(1, input.goalCount),
      },
      {
        id: 'reminder_enabled',
        label: '提醒策略已启用',
        completed: input.remindersEnabled,
      },
    ]
  }

  if (input.userStage === 'newborn_0_3m') {
    return [
      {
        id: 'feed_logged',
        label: '已记录喂养',
        completed: input.todayFeeds > 0,
      },
      {
        id: 'interaction_started',
        label: '已进行亲子互动',
        completed: input.todayInteractions > 0,
      },
      {
        id: 'reminder_enabled',
        label: '提醒策略已启用',
        completed: input.remindersEnabled,
      },
    ]
  }

  return [
    {
      id: 'feed_logged',
      label: '已记录喂养',
      completed: input.todayFeeds > 0,
    },
    {
      id: 'interaction_target',
      label: '亲子互动达 2 次',
      completed: input.todayInteractions >= 2,
    },
    {
      id: 'reminder_enabled',
      label: '提醒策略已启用',
      completed: input.remindersEnabled,
    },
  ]
}

function getKickStreakDays(sessions: KickSession[], nowTs: number): number {
  if (sessions.length === 0) return 0

  const daySet = new Set(sessions.map((session) => getDayKey(session.startedAt)))
  let streak = 0

  for (let i = 0; i < 365; i += 1) {
    const ts = nowTs - i * 86400000
    const day = getDayKey(ts)
    if (daySet.has(day)) {
      streak += 1
      continue
    }

    if (i > 0) break
  }

  return streak
}

function getDayBounds(ts: number): [number, number] {
  const day = new Date(ts)
  day.setHours(0, 0, 0, 0)
  const dayStart = day.getTime()
  return [dayStart, dayStart + 86400000]
}

function getDayKey(ts: number): string {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
