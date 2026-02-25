import type { ReactNode } from 'react'
import { IconChildHeadOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconTimer2OutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconBagCheckOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconGlassFillDuo18 } from 'nucleo-ui-fill-duo-18'
import {
  getDaysUntilDue,
  getSettings,
  getWeeksPregnant,
  type UserStage,
} from './settings.ts'
import { getToolUsage } from './tool-usage.ts'

export type ToolGroupId = 'pregnancy-records' | 'newborn-care' | 'growth-play'

export interface ToolCard {
  id: string
  title: string
  icon: ReactNode
  path: string
  available: boolean
  group: ToolGroupId
  priorityScore?: number
}

export interface ToolGroup {
  id: ToolGroupId
  title: string
  description: string
  tools: ToolCard[]
}

interface AdaptiveContext {
  userStage?: UserStage
  hour?: number
  weeksPregnant?: number | null
  daysUntilDue?: number | null
  now?: number
}

interface EntryToolsOptions {
  limit?: number
  includeRecent?: boolean
}

interface GroupedEntryToolsOptions extends EntryToolsOptions {
  recentLimit?: number
}

export interface GroupedEntryToolsResult {
  recent: ToolCard[]
  groups: ToolGroup[]
}

const GROUP_META: Record<ToolGroupId, Omit<ToolGroup, 'tools'>> = {
  'pregnancy-records': {
    id: 'pregnancy-records',
    title: '孕期记录',
    description: '胎动、宫缩与待产准备',
  },
  'newborn-care': {
    id: 'newborn-care',
    title: '新生照护',
    description: '喂养与提醒策略',
  },
  'growth-play': {
    id: 'growth-play',
    title: '互动成长',
    description: '亲子互动与发育支持',
  },
}

export const allTools: ToolCard[] = [
  {
    id: 'kick-counter',
    title: '数胎动',
    icon: <IconChildHeadOutlineDuo18 size={32} className="text-duo-blue" />,
    path: '/tools/kick-counter',
    available: true,
    group: 'pregnancy-records',
    priorityScore: 1,
  },
  {
    id: 'contraction-timer',
    title: '宫缩计时',
    icon: <IconTimer2OutlineDuo18 size={32} className="text-pink-400" />,
    path: '/tools/contraction-timer',
    available: true,
    group: 'pregnancy-records',
    priorityScore: 1,
  },
  {
    id: 'hospital-bag',
    title: '待产包',
    icon: <IconBagCheckOutlineDuo18 size={32} className="text-duo-orange" />,
    path: '/tools/hospital-bag',
    available: true,
    group: 'pregnancy-records',
    priorityScore: 1,
  },
  {
    id: 'feeding-log',
    title: '喂奶记录',
    icon: <IconGlassFillDuo18 size={32} className="text-duo-purple" />,
    path: '/tools/feeding-log',
    available: true,
    group: 'newborn-care',
    priorityScore: 2,
  },
  {
    id: 'reminders',
    title: '提醒中心',
    icon: <span className="text-[30px] leading-none">🔔</span>,
    path: '/tools/reminders',
    available: true,
    group: 'newborn-care',
    priorityScore: 2,
  },
  {
    id: 'parent-child-play',
    title: '亲子互动',
    icon: <span className="text-[30px] leading-none">🧸</span>,
    path: '/tools/parent-child-play',
    available: true,
    group: 'growth-play',
    priorityScore: 1,
  },
]

export function getAdaptiveTools(context: AdaptiveContext = {}): ToolCard[] {
  return rankTools(context).map((item) => item.tool)
}

export function getEntryTools(
  context: AdaptiveContext = {},
  options: EntryToolsOptions = {},
): ToolCard[] {
  const limit = Math.max(1, options.limit ?? 4)
  const includeRecent = options.includeRecent ?? true
  const now = context.now ?? Date.now()
  const usage = getToolUsage()
  const ranked = rankTools(context, usage, now)
    .map((item) => item.tool)
    .filter((tool) => tool.available)

  if (!includeRecent) {
    return ranked.slice(0, limit)
  }

  const recent = getRecentTools(Math.min(3, limit), now, usage)
  const recentIds = new Set(recent.map((tool) => tool.id))
  const merged = [...recent, ...ranked.filter((tool) => !recentIds.has(tool.id))]

  return merged.slice(0, limit)
}

export function getGroupedEntryTools(
  context: AdaptiveContext = {},
  options: GroupedEntryToolsOptions = {},
): GroupedEntryToolsResult {
  const includeRecent = options.includeRecent ?? true
  const now = context.now ?? Date.now()
  const usage = getToolUsage()
  const ranked = rankTools(context, usage, now)
    .map((item) => item.tool)
    .filter((tool) => tool.available)

  return {
    recent: includeRecent
      ? getRecentTools(options.recentLimit ?? 3, now, usage)
      : [],
    groups: groupToolsByScenario(ranked),
  }
}

export function groupToolsByScenario(tools: ToolCard[]): ToolGroup[] {
  const buckets: Record<ToolGroupId, ToolCard[]> = {
    'pregnancy-records': [],
    'newborn-care': [],
    'growth-play': [],
  }

  for (const tool of tools) {
    buckets[tool.group].push(tool)
  }

  return (Object.keys(GROUP_META) as ToolGroupId[])
    .map((groupId) => ({
      ...GROUP_META[groupId],
      tools: buckets[groupId],
    }))
    .filter((group) => group.tools.length > 0)
}

export function getRecentTools(
  limit = 3,
  now = Date.now(),
  usage = getToolUsage(),
): ToolCard[] {
  const safeLimit = Math.max(1, limit)
  const lookup = new Map(allTools.map((tool) => [tool.id, tool]))

  const rankedRecent = Object.entries(usage)
    .map(([toolId, entry]) => ({
      tool: lookup.get(toolId),
      lastUsedAt: entry.lastUsedAt,
      count: entry.count,
      score: getUsageScore(toolId, usage, now),
    }))
    .filter((entry): entry is {
      tool: ToolCard
      lastUsedAt: number
      count: number
      score: number
    } => Boolean(entry.tool?.available))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.lastUsedAt !== a.lastUsedAt) return b.lastUsedAt - a.lastUsedAt
      return b.count - a.count
    })

  return rankedRecent.slice(0, safeLimit).map((entry) => entry.tool)
}

/** Legacy alias kept for existing callsites. */
export function getOrderedTools(): ToolCard[] {
  return getAdaptiveTools()
}

function rankTools(
  context: AdaptiveContext,
  usage = getToolUsage(),
  now = context.now ?? Date.now(),
): { tool: ToolCard; score: number }[] {
  const weeks = getWeeksPregnant()
  const days = getDaysUntilDue()
  const settings = getSettings()
  const currentHour = context.hour ?? new Date(now).getHours()
  const currentStage = context.userStage ?? settings.userStage
  const currentWeeks = context.weeksPregnant ?? weeks
  const currentDays = context.daysUntilDue ?? days
  const baselineOrder = new Map(allTools.map((tool, index) => [tool.id, index]))

  const ranked = allTools.map((tool) => {
    let score = tool.priorityScore ?? 0
    score += getStageScore(currentStage, tool.id)
    score += getTimeScore(currentHour, tool.id)
    score += getPregnancyScore(currentWeeks, currentDays, tool.id)
    score += getUsageScore(tool.id, usage, now)
    return { tool, score }
  })

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (baselineOrder.get(a.tool.id) ?? 0) - (baselineOrder.get(b.tool.id) ?? 0)
  })

  return ranked
}

function getStageScore(stage: UserStage, toolId: string): number {
  const stageScores: Record<UserStage, Record<string, number>> = {
    pregnancy_late: {
      'kick-counter': 8,
      'contraction-timer': 7,
      'hospital-bag': 6,
      reminders: 5,
      'feeding-log': 4,
      'parent-child-play': 3,
    },
    newborn_0_3m: {
      'feeding-log': 9,
      reminders: 8,
      'parent-child-play': 6,
      'hospital-bag': 4,
      'kick-counter': 2,
      'contraction-timer': 2,
    },
    newborn_3_12m: {
      'feeding-log': 8,
      'parent-child-play': 8,
      reminders: 6,
      'hospital-bag': 4,
      'kick-counter': 1,
      'contraction-timer': 1,
    },
  }

  return stageScores[stage][toolId] ?? 0
}

function getTimeScore(hour: number, toolId: string): number {
  const isNight = hour >= 21 || hour < 7
  if (isNight) {
    if (toolId === 'feeding-log') return 4
    if (toolId === 'reminders') return 4
    if (toolId === 'parent-child-play') return 2
    if (toolId === 'kick-counter' || toolId === 'contraction-timer') return -2
    return 0
  }

  if (toolId === 'kick-counter') return 2
  if (toolId === 'contraction-timer') return 1
  return 0
}

function getPregnancyScore(
  weeks: number | null,
  days: number | null,
  toolId: string,
): number {
  if (weeks === null || days === null) return 0
  if (days <= 0 && toolId === 'contraction-timer') return 5
  if (weeks < 28) {
    if (toolId === 'contraction-timer') return 4
    if (toolId === 'kick-counter') return -3
  }
  if (weeks >= 28 && days > 0 && toolId === 'kick-counter') return 4
  return 0
}

function getUsageScore(
  toolId: string,
  usage: ReturnType<typeof getToolUsage>,
  now: number,
): number {
  const entry = usage[toolId]
  if (!entry) return 0

  const sinceMs = now - entry.lastUsedAt
  let recency = 0
  if (sinceMs <= 24 * 3600 * 1000) recency = 4
  else if (sinceMs <= 72 * 3600 * 1000) recency = 2
  else if (sinceMs <= 7 * 24 * 3600 * 1000) recency = 1

  const frequency = Math.min(4, Math.floor(entry.count / 5))
  return recency + frequency
}
