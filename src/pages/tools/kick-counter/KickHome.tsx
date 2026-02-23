import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, type KickSession } from '../../../lib/db.ts'
import { getSettings } from '../../../lib/settings.ts'
import { formatDate } from '../../../lib/time.ts'
import { isSameDay } from '../../../lib/time.ts'
import TipBanner from '../../../components/TipBanner.tsx'

export default function KickHome() {
  const navigate = useNavigate()
  const [todaySessions, setTodaySessions] = useState<KickSession[]>([])
  const [streak, setStreak] = useState(0)
  const settings = getSettings()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const sessions = await db.sessions.orderBy('startedAt').reverse().toArray()
    const today = sessions.filter(s => isSameDay(s.startedAt, Date.now()))
    setTodaySessions(today)

    // Calculate streak
    let currentStreak = 0
    const now = Date.now()
    const dayMs = 86400000
    for (let i = 0; i < 365; i++) {
      const dayStart = now - i * dayMs
      const hasSession = sessions.some(s => isSameDay(s.startedAt, dayStart))
      if (hasSession) {
        currentStreak++
      } else if (i > 0) {
        break
      }
    }
    setStreak(currentStreak)
  }

  const todayKicks = todaySessions.reduce((sum, s) => sum + s.kickCount, 0)

  return (
    <div className="max-w-lg mx-auto px-4" style={{ paddingTop: 'calc(var(--safe-area-top) + 2rem)' }}>
      {/* Header */}
      <div className="relative flex items-center justify-center mb-4">
        <button
          onClick={() => navigate('/')}
          className="absolute left-0 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 pr-2"
        >
          ← 返回
        </button>
        <h1 className="text-xl font-extrabold text-gray-800 dark:text-white">
          数胎动
        </h1>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center justify-center gap-2 mb-6 animate-slide-up">
          <span className="text-duo-orange text-lg">🔥</span>
          <span className="text-sm font-bold text-duo-orange">
            连续 {streak} 天记录！
          </span>
        </div>
      )}

      {/* Today Summary */}
      <div className="bg-white dark:bg-[#16213e] rounded-3xl p-5 border border-gray-200 dark:border-gray-700/60 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(Date.now())} · 今日
            </p>
            <p className="text-3xl font-extrabold text-gray-800 dark:text-white mt-1">
              {todayKicks} <span className="text-base font-normal text-gray-400">次胎动</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">目标</p>
            <p className="text-lg font-bold text-duo-green">{settings.goalCount} 次</p>
          </div>
        </div>
        {todaySessions.length > 0 && (
          <div className="mt-3 flex gap-1">
            {Array.from({ length: settings.goalCount }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  i < todayKicks
                    ? 'bg-duo-green'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={() => navigate('/tools/kick-counter/session')}
        className="w-full py-5 bg-duo-green hover:bg-duo-green-dark active:scale-95 text-white text-xl font-extrabold rounded-2xl border-b-4 border-duo-green-dark transition-all duration-150 mb-6"
      >
        开始数胎动 👆
      </button>

      {/* Recent Sessions */}
      {todaySessions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
            今日记录
          </h2>
          <div className="space-y-2">
            {todaySessions.map(session => (
              <div
                key={session.id}
                className="bg-white dark:bg-[#16213e] rounded-2xl p-4 flex items-center justify-between border border-gray-200 dark:border-gray-700/60"
              >
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">
                    {new Date(session.startedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {session.endedAt
                      ? `${Math.round((session.endedAt - session.startedAt) / 60000)} 分钟`
                      : '进行中'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-duo-green">
                    {session.kickCount}
                  </span>
                  <span className="text-xs text-gray-400">次</span>
                  {session.goalReached && <span>🎉</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TipBanner />
    </div>
  )
}
