import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs } from '@base-ui/react/tabs'
import { Collapsible } from '@base-ui/react/collapsible'
import { IconChildHeadOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconTimer2OutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconGlassFillDuo18 } from 'nucleo-ui-fill-duo-18'
import { Liveline } from 'liveline'
import StickyHeader from '../components/StickyHeader.tsx'
import { db, type KickSession, type ContractionSession, type Contraction, type FeedingRecord } from '../lib/db.ts'
import { getSettings } from '../lib/settings.ts'
import { formatDate, formatTime, formatDuration, isSameDay } from '../lib/time.ts'
import { getFeedingLabel, getFeedingEmoji, getFeedingColor, getFeedingBgColor, formatFeedingDuration } from '../lib/feeding-helpers.ts'

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
  const [contractionSessions, setContractionSessions] = useState<ContractionSession[]>([])
  const [contractions, setContractions] = useState<Record<string, Contraction[]>>({})
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [chartRange, setChartRange] = useState<7 | 30>(7)
  const [activeTab, setActiveTab] = useState<string | null>('kicks')

  useEffect(() => {
    db.sessions.orderBy('startedAt').reverse().toArray().then(setKickSessions)
    db.contractionSessions.orderBy('startedAt').reverse().toArray().then(setContractionSessions)
    db.feedingRecords.orderBy('startedAt').reverse().toArray().then(setFeedingRecords)
  }, [])

  async function loadContractions(sessionId: string) {
    if (contractions[sessionId]) return
    const list = await db.contractions.where('sessionId').equals(sessionId).sortBy('startedAt')
    setContractions(prev => ({ ...prev, [sessionId]: list }))
  }

  // Kick sessions grouped by date
  const kickGrouped = kickSessions.reduce<{ date: string; ts: number; sessions: KickSession[] }[]>(
    (acc, session) => {
      const dateStr = formatDate(session.startedAt)
      const last = acc[acc.length - 1]
      if (last && last.date === dateStr) {
        last.sessions.push(session)
      } else {
        acc.push({ date: dateStr, ts: session.startedAt, sessions: [session] })
      }
      return acc
    },
    [],
  )

  // Contraction sessions grouped by date
  const contractionGrouped = contractionSessions.reduce<{ date: string; ts: number; sessions: ContractionSession[] }[]>(
    (acc, session) => {
      const dateStr = formatDate(session.startedAt)
      const last = acc[acc.length - 1]
      if (last && last.date === dateStr) {
        last.sessions.push(session)
      } else {
        acc.push({ date: dateStr, ts: session.startedAt, sessions: [session] })
      }
      return acc
    },
    [],
  )

  // Feeding records grouped by date
  const feedingGrouped = feedingRecords.reduce<{ date: string; ts: number; records: FeedingRecord[] }[]>(
    (acc, record) => {
      const dateStr = formatDate(record.startedAt)
      const last = acc[acc.length - 1]
      if (last && last.date === dateStr) {
        last.records.push(record)
      } else {
        acc.push({ date: dateStr, ts: record.startedAt, records: [record] })
      }
      return acc
    },
    [],
  )

  // Chart data for kicks (Liveline)
  const settings = getSettings()
  const isDark = document.documentElement.classList.contains('dark')
  const chartPoints = useMemo(() => getChartPoints(kickSessions, chartRange), [kickSessions, chartRange])
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
                {kickGrouped.map(group => (
                  <div key={group.date}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                        {isSameDay(group.ts, Date.now()) ? '今天' : group.date}
                      </h3>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        共 {group.sessions.reduce((s, ss) => s + ss.kickCount, 0)} 次
                      </span>
                    </div>
                    {/* Single grouped card with dividers */}
                    <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                      {group.sessions.map((session, idx) => (
                        <Collapsible.Root
                          key={session.id}
                          open={expandedId === session.id}
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
                                  {expandedId === session.id ? '▲' : '▼'}
                                </span>
                              )}
                            </div>
                          </Collapsible.Trigger>

                          <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-all duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
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
                            </div>
                          </Collapsible.Panel>
                        </Collapsible.Root>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                {contractionGrouped.map(group => (
                  <div key={group.date}>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2">
                      {isSameDay(group.ts, Date.now()) ? '今天' : group.date}
                    </h3>
                    {/* Single grouped card with dividers */}
                    <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                      {group.sessions.map((session, idx) => (
                        <Collapsible.Root
                          key={session.id}
                          open={expandedId === session.id}
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
                                {expandedId === session.id ? '▲' : '▼'}
                              </span>
                            </div>
                          </Collapsible.Trigger>

                          <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-all duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                            {contractions[session.id] && (
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
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                {feedingGrouped.map(group => (
                  <div key={group.date}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                        {isSameDay(group.ts, Date.now()) ? '今天' : group.date}
                      </h3>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        共 {group.records.length} 次
                      </span>
                    </div>
                    <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                      {group.records.map((record, idx) => (
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
            </>
          )}
        </Tabs.Panel>
      </Tabs.Root>
      </div>
    </div>
  )
}

interface TimelineEvent {
  time: number
  type: 'kick' | 'window'
  label: string
}

function getTimeline(session: KickSession): TimelineEvent[] {
  const events: TimelineEvent[] = []
  let lastWindowId = -1
  let kickNum = 0

  for (const tap of session.taps) {
    if (tap.windowId !== lastWindowId) {
      kickNum++
      lastWindowId = tap.windowId
      events.push({
        time: tap.timestamp,
        type: 'kick',
        label: `第 ${kickNum} 次有效胎动`,
      })
    } else {
      events.push({
        time: tap.timestamp,
        type: 'window',
        label: `窗口内追加点击`,
      })
    }
  }
  return events
}

function getChartPoints(sessions: KickSession[], days: number): { time: number; value: number }[] {
  const points: { time: number; value: number }[] = []
  const now = Date.now()
  const dayMs = 86400000

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * dayMs
    const kicks = sessions
      .filter(s => isSameDay(s.startedAt, dayStart))
      .reduce((sum, s) => sum + s.kickCount, 0)
    points.push({ time: Math.floor(dayStart / 1000), value: kicks })
  }
  return points
}
