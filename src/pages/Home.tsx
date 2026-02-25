import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sileo } from 'sileo'
import OngoingSessionBanner from '../components/home/OngoingSessionBanner.tsx'
import QuickRecordGrid from '../components/home/QuickRecordGrid.tsx'
import SecondaryInsightsPanel from '../components/home/SecondaryInsightsPanel.tsx'
import StageProgressBar from '../components/home/StageProgressBar.tsx'
import TodayStatsCard from '../components/home/TodayStatsCard.tsx'
import {
  createEmptyHomeDashboardSnapshot,
  getHomeDashboardSnapshot,
  getHomeLayoutPrefs,
  saveHomeLayoutPrefs,
} from '../lib/home-dashboard.ts'
import { getDaysUntilDue, getSettings, getWeeksPregnant, type UserStage } from '../lib/settings.ts'
import { hasInviteAccess } from '../lib/auth.ts'
import { useCurrentUserId } from '../lib/data-scope.ts'
import { getDailyRhythmCard, getJourneyCard, getKickSafetyNotice } from '../lib/journey.ts'
import { getGroupedEntryTools, getEntryTools, type ToolCard } from '../lib/tools.tsx'
import { trackToolOpen } from '../lib/tool-usage.ts'
import { getReminderConfig } from '../lib/reminders.ts'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，注意休息哦'
  if (hour < 9) return '早上好！新的一天开始啦'
  if (hour < 12) return '上午好！今天感觉怎么样？'
  if (hour < 14) return '中午好！记得吃饭哦'
  if (hour < 18) return '下午好！宝宝活跃吗？'
  return '晚上好！今天辛苦了'
}

function formatDueDate(days: number): string {
  if (days > 0) return `${days}天`
  if (days === 0) return '今天！'
  return `+${Math.abs(days)}天`
}

function getStageTitle(stage: UserStage): string {
  if (stage === 'newborn_0_3m') return '新生儿 0-3 月'
  if (stage === 'newborn_3_12m') return '新生儿 3-12 月'
  return '孕晚期'
}

function getReminderSummary(enabled: boolean, nightLowStimulus: boolean, priorityOnlyAtNight: boolean): string {
  if (!enabled) {
    return '提醒状态：当前提醒总开关已关闭。'
  }

  if (nightLowStimulus && priorityOnlyAtNight) {
    return '提醒状态：夜间已启用低打扰，仅保留高优先级提醒。'
  }

  return '提醒状态：提醒已开启，可在提醒中心调整夜间策略。'
}

export default function Home() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const settings = getSettings()
  const daysUntilDue = getDaysUntilDue()
  const weeksPregnant = getWeeksPregnant()
  const [currentHour] = useState<number>(() => new Date().getHours())
  const [showAllTools, setShowAllTools] = useState(false)
  const [insightsCollapsed, setInsightsCollapsed] = useState<boolean>(
    () => getHomeLayoutPrefs().secondaryInsightsCollapsed,
  )

  const reminderConfig = getReminderConfig(userId)
  const reminderEnabled = reminderConfig.notificationsEnabled
  const [dashboard, setDashboard] = useState(() =>
    createEmptyHomeDashboardSnapshot({
      goalCount: settings.goalCount,
      userStage: settings.userStage,
      remindersEnabled: reminderEnabled,
    }),
  )

  const greeting = getGreeting()
  const stageTitle = getStageTitle(settings.userStage)
  const stageSubtitle =
    daysUntilDue === null
      ? '补充预产期后可获得更精确建议'
      : weeksPregnant === null
        ? `预产期倒计时 ${formatDueDate(daysUntilDue)}`
        : `孕 ${weeksPregnant} 周 · 预产期倒计时 ${formatDueDate(daysUntilDue)}`
  const stageTone =
    settings.userStage === 'pregnancy_late'
      ? 'purple'
      : settings.userStage === 'newborn_0_3m'
        ? 'green'
        : 'blue'

  const adaptiveContext = {
    userStage: settings.userStage,
    hour: currentHour,
    weeksPregnant,
    daysUntilDue,
  }
  const quickTools = getEntryTools(adaptiveContext, { limit: 4, includeRecent: true })
  const groupedTools = getGroupedEntryTools(adaptiveContext, { includeRecent: false }).groups

  const journey = getJourneyCard(weeksPregnant, daysUntilDue, settings.userStage)
  const rhythm = getDailyRhythmCard(settings.userStage, currentHour)
  const safetyNotice = getKickSafetyNotice({
    userStage: settings.userStage,
    weeksPregnant,
    todayKicks: dashboard.todayKicks,
    goalCount: settings.goalCount,
    currentHour,
    activeKickSession: dashboard.activeKickSession !== null,
  })

  const hasAccess = hasInviteAccess()

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const snapshot = await getHomeDashboardSnapshot(userId, {
        now: Date.now(),
        goalCount: settings.goalCount,
        userStage: settings.userStage,
        remindersEnabled: reminderEnabled,
      })

      if (!cancelled) {
        setDashboard(snapshot)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [reminderEnabled, settings.goalCount, settings.userStage, userId])

  function gotoProtected(path: string, toolId?: string): void {
    if (hasInviteAccess()) {
      if (toolId) trackToolOpen(toolId)
      navigate(path)
      return
    }

    sileo.info({
      title: '请先登录',
      description: '该功能需要登录并绑定邀请码后使用',
    })
    navigate(`/auth/login?next=${encodeURIComponent(path)}`)
  }

  function openTool(tool: ToolCard): void {
    if (!tool.available) return
    gotoProtected(tool.path, tool.id)
  }

  function toggleInsights() {
    setInsightsCollapsed((previous) => {
      const next = !previous
      saveHomeLayoutPrefs({ secondaryInsightsCollapsed: next })
      return next
    })
  }

  return (
    <div className="pb-4">
      <div
        className="bg-gradient-to-b from-duo-green/15 to-transparent dark:from-duo-green/10 dark:to-transparent pb-10"
        style={{ paddingTop: 'calc(var(--safe-area-top) + 2rem)' }}
      >
        <div className="flex flex-col items-center max-w-lg mx-auto px-4">
          <div className="w-20 h-20 mb-3 rounded-full overflow-hidden ring-4 ring-duo-green/20 dark:ring-duo-green/15 animate-float">
            <img
              src="/mascot.png"
              alt="宝宝助手"
              className="w-full h-full object-cover scale-135"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white">宝宝助手</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{greeting}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-6">
        <StageProgressBar
          title={stageTitle}
          subtitle={stageSubtitle}
          progress={dashboard.completionRate}
          tone={stageTone}
        />

        <TodayStatsCard
          todayKicks={dashboard.todayKicks}
          todayFeeds={dashboard.todayFeeds}
          completionRate={dashboard.completionRate}
          lastFeedAt={dashboard.lastFeedAt}
          onOpenKicks={() => gotoProtected('/tools/kick-counter', 'kick-counter')}
          onOpenFeeds={() => gotoProtected('/tools/feeding-log', 'feeding-log')}
          onOpenCompletion={() => gotoProtected('/history')}
        />

        {dashboard.activeKickSession && (
          <OngoingSessionBanner
            session={dashboard.activeKickSession}
            onContinue={() =>
              gotoProtected(
                '/tools/kick-counter/session/' + dashboard.activeKickSession.id,
                'kick-counter',
              )
            }
          />
        )}

        <div>
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            快速记录
          </p>
          <QuickRecordGrid tools={quickTools} onOpenTool={openTool} />
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              全部工具
            </p>
            <button
              onClick={() => setShowAllTools((previous) => !previous)}
              className="text-xs font-bold text-duo-blue"
            >
              {showAllTools ? '收起 ↑' : '查看全部 ↓'}
            </button>
          </div>

          {!showAllTools ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              常用入口已在上方展示。可点击“查看全部”按场景选择工具。
            </p>
          ) : (
            <div className="space-y-4">
              {groupedTools.map((group) => (
                <div key={group.id}>
                  <p className="text-xs font-extrabold text-gray-700 dark:text-gray-200">
                    {group.title}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {group.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {group.tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => openTool(tool)}
                        className="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-left active:scale-[0.98] transition-transform"
                      >
                        <div className="flex items-center gap-2">
                          <div className="shrink-0">{tool.icon}</div>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{tool.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SecondaryInsightsPanel
          collapsed={insightsCollapsed}
          onToggle={toggleInsights}
          journey={journey}
          rhythm={rhythm}
          reminderSummary={getReminderSummary(
            reminderConfig.notificationsEnabled,
            reminderConfig.nightLowStimulus,
            reminderConfig.priorityOnlyAtNight,
          )}
          safetyNotice={safetyNotice}
        />

        {!hasAccess && (
          <div className="rounded-2xl border border-duo-orange/30 bg-duo-orange/10 px-4 py-3">
            <p className="text-xs font-bold text-duo-orange">
              当前为游客模式，记录与历史功能需登录并绑定邀请码后使用。
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-2 mb-4 px-6">
          本应用仅为记录工具，不提供医学建议。如有异常请咨询医生。
        </p>
      </div>
    </div>
  )
}
