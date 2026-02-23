import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, type ContractionSession } from '../../../lib/db.ts'
import { formatDate, formatTime, isSameDay } from '../../../lib/time.ts'

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function ContractionHome() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ContractionSession[]>([])

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    const all = await db.contractionSessions.orderBy('startedAt').reverse().toArray()
    setSessions(all)
  }

  // Find active (unended) session
  const activeSession = sessions.find(s => s.endedAt === null)

  async function startNewSession() {
    const id = crypto.randomUUID()
    await db.contractionSessions.put({
      id,
      startedAt: Date.now(),
      endedAt: null,
      contractionCount: 0,
      avgDuration: null,
      avgInterval: null,
      alertTriggered: false,
    })
    navigate('/tools/contraction-timer/session/' + id)
  }

  function resumeSession(id: string) {
    navigate('/tools/contraction-timer/session/' + id)
  }

  // Group sessions by date
  const grouped = sessions.reduce<{ date: string; ts: number; sessions: ContractionSession[] }[]>(
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

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 pr-2"
        >
          ← 返回
        </button>
        <h1 className="text-xl font-extrabold text-gray-800 dark:text-white">
          ⏱️ 宫缩计时
        </h1>
      </div>

      {/* Resume active session */}
      {activeSession && (
        <button
          onClick={() => resumeSession(activeSession.id)}
          className="w-full py-4 bg-duo-orange hover:bg-duo-orange/90 active:scale-95 text-white text-lg font-extrabold rounded-2xl border-b-4 border-amber-600 transition-all duration-150 mb-4 animate-pulse"
        >
          继续当前记录 ({activeSession.contractionCount} 次宫缩)
        </button>
      )}

      {/* Start Button */}
      <button
        onClick={startNewSession}
        className="w-full py-5 bg-duo-orange hover:bg-duo-orange/90 active:scale-95 text-white text-xl font-extrabold rounded-2xl border-b-4 border-amber-600 transition-all duration-150 mb-6"
      >
        开始新记录 ⏱️
      </button>

      {/* 5-1-1 Rule info */}
      <div className="bg-duo-orange/10 dark:bg-duo-orange/5 rounded-2xl p-4 mb-6">
        <p className="text-sm font-bold text-duo-orange mb-1">📋 5-1-1 规则</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          当宫缩间隔 <strong>5 分钟</strong>，每次持续 <strong>1 分钟</strong>，
          并持续至少 <strong>1 小时</strong>，应该去医院了。
        </p>
      </div>

      {/* History */}
      {sessions.length > 0 ? (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.date}>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                {isSameDay(group.ts, Date.now()) ? '今天' : group.date}
              </h3>
              <div className="space-y-2">
                {group.sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => session.endedAt === null ? resumeSession(session.id) : undefined}
                    className="w-full bg-white dark:bg-[#16213e] rounded-2xl p-4 flex items-center justify-between text-left border border-gray-200 dark:border-gray-700/60"
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
                        {session.avgDuration && (
                          <span className="text-xs text-gray-400">
                            平均时长 {formatMs(session.avgDuration)}
                          </span>
                        )}
                        {session.avgInterval && (
                          <span className="text-xs text-gray-400">
                            平均间隔 {formatMs(session.avgInterval)}
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
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-gray-400 dark:text-gray-500">还没有宫缩记录</p>
        </div>
      )}
    </div>
  )
}
