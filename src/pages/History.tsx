import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs } from '@base-ui/react/tabs'
import { Collapsible } from '@base-ui/react/collapsible'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { IconChildHeadOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconTimer2OutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconGlassFillDuo18 } from 'nucleo-ui-fill-duo-18'
import { Liveline } from 'liveline'
import StickyHeader from '../components/StickyHeader.tsx'
import {
  db,
  type Contraction,
  type ContractionSession,
  type FeedingRecord,
  type KickSession,
  getContractionsByUserAndSession,
  getContractionSessionsByUserDesc,
  getFeedingRecordsByUserDesc,
  getKickSessionsByUserDesc,
} from '../lib/db.ts'
import { getSettings } from '../lib/settings.ts'
import { formatDate, formatTime, formatDuration, isSameDay } from '../lib/time.ts'
import { getFeedingLabel, getFeedingEmoji, getFeedingColor, getFeedingBgColor, formatFeedingDuration } from '../lib/feeding-helpers.ts'
import { getChartPoints, getTimeline } from './history-helpers.ts'
import { useCurrentUserId } from '../lib/data-scope.ts'

const HISTORY_PAGE_SIZE = 80
const GROUP_WINDOW_SIZE = 12

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}秒`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}分${sec}秒` : `${m}分`
}

export default function History() {
  const navigate = useNavigate()
  const [kickSessions, setKickSessions] = useState<KickSession[]>([])
  const [kickChartSessions, setKickChartSessions] = useState<KickSession[]>([])
  const [kickChartLoaded, setKickChartLoaded] = useState(false)
  const [contractionSessions, setContractionSessions] = useState<ContractionSession[]>([])
  const [contractions, setContractions] = useState<Record<string, Contraction[]>>({})
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([])
  const [kickBeforeStartedAt, setKickBeforeStartedAt] = useState<number | null>(null)
  const [contractionBeforeStartedAt, setContractionBeforeStartedAt] = useState<number | null>(null)
  const [feedingBeforeStartedAt, setFeedingBeforeStartedAt] = useState<number | null>(null)
  const [kickHasMore, setKickHasMore] = useState(false)
  const [contractionHasMore, setContractionHasMore] = useState(false)
  const [feedingHasMore, setFeedingHasMore] = useState(false)
  const [kickVisibleGroups, setKickVisibleGroups] = useState(GROUP_WINDOW_SIZE)
  const [contractionVisibleGroups, setContractionVisibleGroups] = useState(GROUP_WINDOW_SIZE)
  const [feedingVisibleGroups, setFeedingVisibleGroups] = useState(GROUP_WINDOW_SIZE)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [chartRange, setChartRange] = useState<7 | 30>(7)
  const [activeTab, setActiveTab] = useState<string | null>('kicks')
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [todayTimestamp] = useState<number>(() => Date.now())
  const userId = useCurrentUserId()

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!userId) {
        if (cancelled) return
        setKickSessions([])
        setKickChartSessions([])
        setKickChartLoaded(false)
        setContractionSessions([])
        setFeedingRecords([])
        setContractions({})
        setKickBeforeStartedAt(null)
        setContractionBeforeStartedAt(null)
        setFeedingBeforeStartedAt(null)
        setKickHasMore(false)
        setContractionHasMore(false)
        setFeedingHasMore(false)
        setKickVisibleGroups(GROUP_WINDOW_SIZE)
        setContractionVisibleGroups(GROUP_WINDOW_SIZE)
        setFeedingVisibleGroups(GROUP_WINDOW_SIZE)
        return
      }

      const [kick, contraction, feeding] = await Promise.all([
        getKickSessionsByUserDesc(userId, { limit: HISTORY_PAGE_SIZE }),
        getContractionSessionsByUserDesc(userId, { limit: HISTORY_PAGE_SIZE }),
        getFeedingRecordsByUserDesc(userId, { limit: HISTORY_PAGE_SIZE }),
      ])
      if (cancelled) return

      setKickSessions(kick)
      setKickChartSessions(kick)
      setKickChartLoaded(false)
      setContractionSessions(contraction)
      setFeedingRecords(feeding)
      const kickNext = getNextBeforeStartedAt(kick)
      const contractionNext = getNextBeforeStartedAt(contraction)
      const feedingNext = getNextBeforeStartedAt(feeding)
      setKickBeforeStartedAt(kickNext)
      setContractionBeforeStartedAt(contractionNext)
      setFeedingBeforeStartedAt(feedingNext)
      setKickHasMore(kickNext !== null)
      setContractionHasMore(contractionNext !== null)
      setFeedingHasMore(feedingNext !== null)
      setKickVisibleGroups(GROUP_WINDOW_SIZE)
      setContractionVisibleGroups(GROUP_WINDOW_SIZE)
      setFeedingVisibleGroups(GROUP_WINDOW_SIZE)
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!userId || activeTab !== 'kicks' || kickChartLoaded) return
      const now = Date.now()
      const kickForChart = await getKickSessionsByUserDesc(userId, {
        sinceStartedAt: now - 86400000 * 31,
      })
      if (cancelled) return
      setKickChartSessions(kickForChart)
      setKickChartLoaded(true)
    })()

    return () => {
      cancelled = true
    }
  }, [activeTab, kickChartLoaded, userId])

  async function loadContractions(sessionId: string) {
    if (!userId || contractions[sessionId]) return
    const list = await getContractionsByUserAndSession(userId, sessionId)
    setContractions(prev => ({ ...prev, [sessionId]: list }))
  }

  async function loadMoreKicks() {
    if (!userId || kickBeforeStartedAt === null) return
    const next = await getKickSessionsByUserDesc(userId, {
      beforeStartedAt: kickBeforeStartedAt,
      limit: HISTORY_PAGE_SIZE,
    })
    setKickSessions(prev => mergeById(prev, next))
    const nextBefore = getNextBeforeStartedAt(next)
    setKickBeforeStartedAt(nextBefore)
    setKickHasMore(nextBefore !== null)
  }

  async function loadMoreContractions() {
    if (!userId || contractionBeforeStartedAt === null) return
    const next = await getContractionSessionsByUserDesc(userId, {
      beforeStartedAt: contractionBeforeStartedAt,
      limit: HISTORY_PAGE_SIZE,
    })
    setContractionSessions(prev => mergeById(prev, next))
    const nextBefore = getNextBeforeStartedAt(next)
    setContractionBeforeStartedAt(nextBefore)
    setContractionHasMore(nextBefore !== null)
  }

  async function loadMoreFeeding() {
    if (!userId || feedingBeforeStartedAt === null) return
    const next = await getFeedingRecordsByUserDesc(userId, {
      beforeStartedAt: feedingBeforeStartedAt,
      limit: HISTORY_PAGE_SIZE,
    })
    setFeedingRecords(prev => mergeById(prev, next))
    const nextBefore = getNextBeforeStartedAt(next)
    setFeedingBeforeStartedAt(nextBefore)
    setFeedingHasMore(nextBefore !== null)
  }

  async function handleDeleteSession() {
    if (!deletingSessionId || !userId) return
    const target = await db.sessions.get(deletingSessionId)
    if (!target || target.userId !== userId) {
      setDeletingSessionId(null)
      return
    }
    await db.sessions.delete(deletingSessionId)
    setKickSessions(prev => prev.filter(s => s.id !== deletingSessionId))
    setKickChartSessions(prev => prev.filter(s => s.id !== deletingSessionId))
    setExpandedId(null)
    setDeletingSessionId(null)
  }

  // Kick sessions grouped by date
  const kickGrouped = useMemo(
    () =>
      groupByDate(kickSessions, (entry) => ({
        ts: entry.startedAt,
        payload: entry,
      })),
    [kickSessions],
  )

  // Contraction sessions grouped by date
  const contractionGrouped = useMemo(
    () =>
      groupByDate(contractionSessions, (entry) => ({
        ts: entry.startedAt,
        payload: entry,
      })),
    [contractionSessions],
  )

  // Feeding records grouped by date
  const feedingGrouped = useMemo(
    () =>
      groupByDate(feedingRecords, (entry) => ({
        ts: entry.startedAt,
        payload: entry,
      })),
    [feedingRecords],
  )
  const visibleKickGrouped = useMemo(
    () => kickGrouped.slice(0, kickVisibleGroups),
    [kickGrouped, kickVisibleGroups],
  )
  const visibleContractionGrouped = useMemo(
    () => contractionGrouped.slice(0, contractionVisibleGroups),
    [contractionGrouped, contractionVisibleGroups],
  )
  const visibleFeedingGrouped = useMemo(
    () => feedingGrouped.slice(0, feedingVisibleGroups),
    [feedingGrouped, feedingVisibleGroups],
  )

  // Chart data for kicks (Liveline)
  const settings = getSettings()
  const isDark = document.documentElement.classList.contains('dark')
  const chartPoints = useMemo(
    () => getChartPoints(kickChartSessions, chartRange),
    [kickChartSessions, chartRange],
  )
  const todayKicks = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].value : 0

  const indicatorColor = activeTab === 'contractions' ? 'bg-duo-orange' : activeTab === 'feeding' ? 'bg-duo-purple' : 'bg-duo-green'

  return (
    <div className="max-w-lg mx-auto pb-4">
      <StickyHeader>
        <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white text-center">
          记录
        </h1>
      </StickyHeader>
      <div className="px-4">
      <Tabs.Root defaultValue="kicks" onValueChange={setActiveTab}>
        {/* Tab Switcher — Duo style with bottom border accent */}
        <Tabs.List className="relative flex border-b-2 border-gray-200 dark:border-gray-700/60 mb-6">
          <Tabs.Tab
            value="kicks"
            className="flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors text-gray-400 data-[selected]:text-duo-green outline-none cursor-pointer"
          >
            <IconChildHeadOutlineDuo18 size={16} className="inline-block align-[-2px] mr-1" /> 胎动
          </Tabs.Tab>
          <Tabs.Tab
            value="contractions"
            className="flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors text-gray-400 data-[selected]:text-duo-orange outline-none cursor-pointer"
          >
            <IconTimer2OutlineDuo18 size={16} className="inline-block align-[-2px] mr-1" /> 宫缩
          </Tabs.Tab>
          <Tabs.Tab
            value="feeding"
            className="flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors text-gray-400 data-[selected]:text-duo-purple outline-none cursor-pointer"
          >
            <IconGlassFillDuo18 size={16} className="inline-block align-[-2px] mr-1" /> 喂奶
          </Tabs.Tab>
          <Tabs.Indicator className={`absolute bottom-0 left-[var(--active-tab-left)] h-[3px] w-[var(--active-tab-width)] rounded-full -mb-[1px] transition-all duration-200 ease-out ${indicatorColor}`} />
        </Tabs.List>

        {/* Kicks Tab */}
        <Tabs.Panel value="kicks" className="outline-none">
          {kickSessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-gray-400 dark:text-gray-500 font-bold">还没有胎动记录</p>
              <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">开始第一次数胎动吧！</p>
            </div>
          ) : (
            <>
              {/* Trend Chart */}
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                胎动趋势
              </p>
              <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 mb-6 border border-gray-200 dark:border-gray-700/60">
                <div className="flex items-center justify-end mb-3">
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
                    <button
                      onClick={() => setChartRange(7)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        chartRange === 7
                          ? 'bg-white dark:bg-gray-700 text-duo-green'
                          : 'text-gray-400'
                      }`}
                    >
                      7天
                    </button>
                    <button
                      onClick={() => setChartRange(30)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        chartRange === 30
                          ? 'bg-white dark:bg-gray-700 text-duo-green'
                          : 'text-gray-400'
                      }`}
                    >
                      30天
                    </button>
                  </div>
                </div>
                <div className="h-40">
                  <Liveline
                    data={chartPoints}
                    value={todayKicks}
                    color="#58CC02"
                    theme={isDark ? 'dark' : 'light'}
                    referenceLine={{ value: settings.goalCount, label: '目标 ' + settings.goalCount }}
                    formatValue={(v) => Math.round(v) + ' 次'}
                    formatTime={(t) => {
                      const d = new Date(t * 1000)
                      return chartRange <= 7
                        ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
                        : `${d.getMonth() + 1}/${d.getDate()}`
                    }}
                    window={chartRange * 86400}
                    grid
                    fill
                    scrub
                    exaggerate
                    momentum={false}
                    badge={false}
                    pulse={false}
                  />
                </div>
              </div>

              {/* Session List — grouped card per date */}
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                记录列表
              </p>
              <div className="space-y-6">
                {visibleKickGrouped.map(group => (
                  <div key={group.date}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                        {isSameDay(group.ts, todayTimestamp) ? '今天' : group.date}
                      </h3>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        共 {group.items.reduce((sum, session) => sum + session.kickCount, 0)} 次
                      </span>
                    </div>
                    {/* Single grouped card with dividers */}
                    <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                      {group.items.map((session, idx) => {
                        const isExpanded = expandedId === session.id
                        return (
                          <Collapsible.Root
                            key={session.id}
                            open={isExpanded}
                            onOpenChange={(open) => setExpandedId(open ? session.id : null)}
                          >
                            {idx > 0 && (
                              <div className="mx-4 border-t border-gray-100 dark:border-gray-700/40" />
                            )}
                            <Collapsible.Trigger className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer outline-none">
                              <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">
                                  {formatTime(session.startedAt)}
                                  {session.endedAt && (
                                    <span className="text-gray-400 font-normal">
                                      {' → '}{formatTime(session.endedAt)}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {session.endedAt
                                    ? formatDuration(session.endedAt - session.startedAt)
                                    : '进行中'}
                                  {' · '}{session.taps.length} 次点击
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-extrabold text-duo-green">
                                  {session.kickCount}
                                </span>
                                {session.goalReached && <span>🎉</span>}
                                {session.endedAt === null ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate('/tools/kick-counter/session/' + session.id)
                                    }}
                                    className="text-xs font-bold text-duo-green"
                                  >
                                    继续 →
                                  </button>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600 text-xs transition-transform duration-200 group-data-[panel-open]:rotate-180">
                                    {isExpanded ? '▲' : '▼'}
                                  </span>
                                )}
                              </div>
                            </Collapsible.Trigger>

                            <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-all duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                              {isExpanded && (
                                <div className="px-4 pb-4">
                                  <div className="bg-gray-50 dark:bg-[#0f1629] rounded-xl p-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                                      时间线
                                    </p>
                                    <div className="space-y-2">
                                      {getTimeline(session).map((event, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs">
                                          <span className="text-gray-400 font-mono w-14 shrink-0">
                                            {formatTime(event.time)}
                                          </span>
                                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                                            event.type === 'kick' ? 'bg-duo-green' : 'bg-duo-orange'
                                          }`} />
                                          <span className="text-gray-600 dark:text-gray-400">
                                            {event.label}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setDeletingSessionId(session.id)}
                                    className="w-full mt-3 py-2.5 text-sm font-bold text-duo-red bg-duo-red/10 rounded-xl active:scale-95 transition-transform cursor-pointer"
                                  >
                                    删除此记录
                                  </button>
                                </div>
                              )}
                            </Collapsible.Panel>
                          </Collapsible.Root>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {kickGrouped.length > kickVisibleGroups && (
                <button
                  onClick={() => setKickVisibleGroups(value => value + GROUP_WINDOW_SIZE)}
                  className="w-full mt-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-2xl active:scale-95 transition-transform"
                >
                  显示更多日期分组
                </button>
              )}
              {kickHasMore && (
                <button
                  onClick={() => void loadMoreKicks()}
                  className="w-full mt-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 active:scale-95 transition-transform"
                >
                  加载更多胎动记录
                </button>
              )}
            </>
          )}
        </Tabs.Panel>

        {/* Contractions Tab */}
        <Tabs.Panel value="contractions" className="outline-none">
          {contractionSessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-gray-400 dark:text-gray-500 font-bold">还没有宫缩记录</p>
              <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">开始第一次宫缩计时吧！</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                记录列表
              </p>
              <div className="space-y-6">
                {visibleContractionGrouped.map(group => (
                  <div key={group.date}>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2">
                      {isSameDay(group.ts, todayTimestamp) ? '今天' : group.date}
                    </h3>
                    {/* Single grouped card with dividers */}
                    <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                      {group.items.map((session, idx) => {
                        const isExpanded = expandedId === session.id
                        return (
                          <Collapsible.Root
                            key={session.id}
                            open={isExpanded}
                            onOpenChange={(open) => {
                              setExpandedId(open ? session.id : null)
                              if (open) loadContractions(session.id)
                            }}
                          >
                            {idx > 0 && (
                              <div className="mx-4 border-t border-gray-100 dark:border-gray-700/40" />
                            )}
                            <Collapsible.Trigger className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer outline-none">
                              <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">
                                  {formatTime(session.startedAt)}
                                  {session.endedAt && (
                                    <span className="text-gray-400 font-normal">
                                      {' → '}{formatTime(session.endedAt)}
                                    </span>
                                  )}
                                </p>
                                <div className="flex gap-3 mt-1">
                                  {session.avgDuration !== null && (
                                    <span className="text-xs text-gray-400">
                                      时长 {formatMs(session.avgDuration)}
                                    </span>
                                  )}
                                  {session.avgInterval !== null && (
                                    <span className="text-xs text-gray-400">
                                      间隔 {formatMs(session.avgInterval)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-extrabold text-duo-orange">
                                  {session.contractionCount}
                                </span>
                                <span className="text-xs text-gray-400">次</span>
                                {session.alertTriggered && <span>🏥</span>}
                                <span className="text-gray-300 dark:text-gray-600 text-xs">
                                  {isExpanded ? '▲' : '▼'}
                                </span>
                              </div>
                            </Collapsible.Trigger>

                            <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-all duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                              {isExpanded && contractions[session.id] && (
                                <div className="px-4 pb-4">
                                  <div className="bg-gray-50 dark:bg-[#0f1629] rounded-xl p-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                                      宫缩详情
                                    </p>
                                    <div className="space-y-2">
                                      {contractions[session.id].map((c, i) => (
                                        <div key={c.id} className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-3">
                                            <span className="text-gray-400 font-mono w-14 shrink-0">
                                              {formatTime(c.startedAt)}
                                            </span>
                                            <span className="w-2 h-2 rounded-full bg-duo-orange shrink-0" />
                                            <span className="text-gray-600 dark:text-gray-400">
                                              第 {i + 1} 次
                                              {c.interval !== null && c.interval > 0 && (
                                                <span className="text-gray-400"> · 间隔 {formatMs(c.interval)}</span>
                                              )}
                                            </span>
                                          </div>
                                          <span className="font-bold text-duo-orange">
                                            {c.duration ? formatMs(c.duration) : '--'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Collapsible.Panel>
                          </Collapsible.Root>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {contractionGrouped.length > contractionVisibleGroups && (
                <button
                  onClick={() =>
                    setContractionVisibleGroups(value => value + GROUP_WINDOW_SIZE)
                  }
                  className="w-full mt-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-2xl active:scale-95 transition-transform"
                >
                  显示更多日期分组
                </button>
              )}
              {contractionHasMore && (
                <button
                  onClick={() => void loadMoreContractions()}
                  className="w-full mt-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 active:scale-95 transition-transform"
                >
                  加载更多宫缩记录
                </button>
              )}
            </>
          )}
        </Tabs.Panel>

        {/* Feeding Tab */}
        <Tabs.Panel value="feeding" className="outline-none">
          {feedingRecords.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-gray-400 dark:text-gray-500 font-bold">还没有喂奶记录</p>
              <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">开始第一次喂奶记录吧！</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                记录列表
              </p>
              <div className="space-y-6">
                {visibleFeedingGrouped.map(group => (
                  <div key={group.date}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                        {isSameDay(group.ts, todayTimestamp) ? '今天' : group.date}
                      </h3>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        共 {group.items.length} 次
                      </span>
                    </div>
                    <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                      {group.items.map((record, idx) => (
                        <div key={record.id}>
                          {idx > 0 && (
                            <div className="mx-4 border-t border-gray-100 dark:border-gray-700/40" />
                          )}
                          <div className="px-4 py-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${getFeedingBgColor(record.type)}`} />
                              <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">
                                  {getFeedingEmoji(record.type)} {getFeedingLabel(record.type)}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {formatTime(record.startedAt)}
                                  {record.endedAt && record.startedAt !== record.endedAt && (
                                    <span className="text-gray-400 font-normal">
                                      {' → '}{formatTime(record.endedAt)}
                                    </span>
                                  )}
                                  {record.duration ? ` · ${formatFeedingDuration(record.duration)}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {record.volumeMl ? (
                                <span className={`text-sm font-extrabold ${getFeedingColor(record.type)}`}>
                                  {record.volumeMl}ml
                                </span>
                              ) : record.duration ? (
                                <span className={`text-sm font-extrabold ${getFeedingColor(record.type)}`}>
                                  {formatFeedingDuration(record.duration)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {feedingGrouped.length > feedingVisibleGroups && (
                <button
                  onClick={() => setFeedingVisibleGroups(value => value + GROUP_WINDOW_SIZE)}
                  className="w-full mt-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-2xl active:scale-95 transition-transform"
                >
                  显示更多日期分组
                </button>
              )}
              {feedingHasMore && (
                <button
                  onClick={() => void loadMoreFeeding()}
                  className="w-full mt-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 active:scale-95 transition-transform"
                >
                  加载更多喂奶记录
                </button>
              )}
            </>
          )}
        </Tabs.Panel>
      </Tabs.Root>
      </div>

      {/* Delete Session Confirmation */}
      <AlertDialog.Root open={deletingSessionId !== null} onOpenChange={(open) => { if (!open) setDeletingSessionId(null) }}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <AlertDialog.Popup className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#16213e] rounded-t-3xl px-6 pt-5 pb-8 transition-all duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full outline-none z-50">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-5" />
            <AlertDialog.Title className="text-lg font-extrabold text-gray-800 dark:text-white text-center mb-2">
              删除这条胎动记录？
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-400 dark:text-gray-500 text-center mb-6">
              删除后无法恢复
            </AlertDialog.Description>
            <div className="flex gap-3">
              <AlertDialog.Close className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-2xl active:scale-95 transition-transform cursor-pointer">
                取消
              </AlertDialog.Close>
              <button
                onClick={handleDeleteSession}
                className="flex-1 py-3.5 bg-duo-red text-white font-bold rounded-2xl border-b-4 border-red-700 active:scale-95 transition-all cursor-pointer"
              >
                删除
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}

function getNextBeforeStartedAt<T extends { startedAt: number }>(
  list: T[],
): number | null {
  if (list.length < HISTORY_PAGE_SIZE) return null
  return list[list.length - 1]?.startedAt ?? null
}

function mergeById<T extends { id: string; startedAt: number }>(
  current: T[],
  incoming: T[],
): T[] {
  const map = new Map(current.map(item => [item.id, item]))
  for (const item of incoming) {
    map.set(item.id, item)
  }
  return Array.from(map.values()).sort((a, b) => b.startedAt - a.startedAt)
}

function groupByDate<T>(
  list: T[],
  pick: (item: T) => { ts: number; payload: T },
): { date: string; ts: number; items: T[] }[] {
  const grouped: { date: string; ts: number; items: T[] }[] = []

  for (const item of list) {
    const picked = pick(item)
    const dateStr = formatDate(picked.ts)
    const last = grouped[grouped.length - 1]
    if (last && last.date === dateStr) {
      last.items.push(picked.payload)
    } else {
      grouped.push({ date: dateStr, ts: picked.ts, items: [picked.payload] })
    }
  }

  return grouped
}
