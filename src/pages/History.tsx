import { useState, useEffect } from 'react'
import { IconChildHeadOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconTimer2OutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { db, type KickSession, type ContractionSession, type Contraction } from '../lib/db.ts'
import { formatDate, formatTime, formatDuration, isSameDay } from '../lib/time.ts'

type Tab = 'kicks' | 'contractions'

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}秒`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}分${sec}秒` : `${m}分`
}

export default function History() {
  const [tab, setTab] = useState<Tab>('kicks')
  const [kickSessions, setKickSessions] = useState<KickSession[]>([])
  const [contractionSessions, setContractionSessions] = useState<ContractionSession[]>([])
  const [contractions, setContractions] = useState<Record<string, Contraction[]>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [chartRange, setChartRange] = useState<7 | 30>(7)

  useEffect(() => {
    db.sessions.orderBy('startedAt').reverse().toArray().then(setKickSessions)
    db.contractionSessions.orderBy('startedAt').reverse().toArray().then(setContractionSessions)
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

  // Chart data for kicks
  const chartData = getChartData(kickSessions, chartRange)
  const maxKicks = Math.max(...chartData.map(d => d.kicks), 1)

  return (
    <div className="max-w-lg mx-auto px-4 pb-4" style={{ paddingTop: 'calc(var(--safe-area-top) + 2rem)' }}>
      <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-6 text-center">
        记录
      </h1>

      {/* Tab Switcher — Duo style with bottom border accent */}
      <div className="flex border-b-2 border-gray-200 dark:border-gray-700/60 mb-6">
        <button
          onClick={() => setTab('kicks')}
          className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${
            tab === 'kicks'
              ? 'text-duo-green'
              : 'text-gray-400'
          }`}
        >
          <IconChildHeadOutlineDuo18 size={16} className="inline-block align-[-2px] mr-1" /> 胎动
          {tab === 'kicks' && (
            <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-duo-green rounded-full -mb-[2px]" />
          )}
        </button>
        <button
          onClick={() => setTab('contractions')}
          className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${
            tab === 'contractions'
              ? 'text-duo-orange'
              : 'text-gray-400'
          }`}
        >
          <IconTimer2OutlineDuo18 size={16} className="inline-block align-[-2px] mr-1" /> 宫缩
          {tab === 'contractions' && (
            <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-duo-orange rounded-full -mb-[2px]" />
          )}
        </button>
      </div>

      {/* Kicks Tab */}
      {tab === 'kicks' && (
        <>
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
                <div className="flex items-center justify-end mb-4">
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
                <div className="flex items-end gap-1 h-32">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-400 font-bold">
                        {d.kicks > 0 ? d.kicks : ''}
                      </span>
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          d.kicks > 0
                            ? 'bg-duo-green'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        style={{
                          height: `${Math.max((d.kicks / maxKicks) * 80, d.kicks > 0 ? 8 : 4)}%`,
                        }}
                      />
                      <span className="text-[10px] text-gray-400 truncate w-full text-center">
                        {d.label}
                      </span>
                    </div>
                  ))}
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
                        <div key={session.id}>
                          {idx > 0 && (
                            <div className="mx-4 border-t border-gray-100 dark:border-gray-700/40" />
                          )}
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === session.id ? null : session.id)
                            }
                            className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                          >
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
                              <span className="text-gray-300 dark:text-gray-600 text-xs">
                                {expandedId === session.id ? '▲' : '▼'}
                              </span>
                            </div>
                          </button>

                          {expandedId === session.id && (
                            <div className="px-4 pb-4 animate-slide-up">
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
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Contractions Tab */}
      {tab === 'contractions' && (
        <>
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
                        <div key={session.id}>
                          {idx > 0 && (
                            <div className="mx-4 border-t border-gray-100 dark:border-gray-700/40" />
                          )}
                          <button
                            onClick={() => {
                              const newId = expandedId === session.id ? null : session.id
                              setExpandedId(newId)
                              if (newId) loadContractions(session.id)
                            }}
                            className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                          >
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
                          </button>

                          {expandedId === session.id && contractions[session.id] && (
                            <div className="px-4 pb-4 animate-slide-up">
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
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
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

function getChartData(sessions: KickSession[], days: number) {
  const data: { label: string; kicks: number }[] = []
  const now = Date.now()
  const dayMs = 86400000

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * dayMs
    const d = new Date(dayStart)
    const kicks = sessions
      .filter(s => isSameDay(s.startedAt, dayStart))
      .reduce((sum, s) => sum + s.kickCount, 0)

    data.push({
      label: days <= 7
        ? ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
        : `${d.getMonth() + 1}/${d.getDate()}`,
      kicks,
    })
  }
  return data
}
