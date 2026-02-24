import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { db, type KickSession } from '../../../lib/db.ts'
import { getSettings } from '../../../lib/settings.ts'
import { formatDate } from '../../../lib/time.ts'
import { isSameDay } from '../../../lib/time.ts'
import StickyHeader from '../../../components/StickyHeader.tsx'
import TipBanner from '../../../components/TipBanner.tsx'

export default function KickHome() {
  const navigate = useNavigate()
  const [todaySessions, setTodaySessions] = useState<KickSession[]>([])
  const [activeSession, setActiveSession] = useState<KickSession | null>(null)
  const [streak, setStreak] = useState(0)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const settings = getSettings()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const sessions = await db.sessions.orderBy('startedAt').reverse().toArray()
    const today = sessions.filter(s => isSameDay(s.startedAt, Date.now()))
    setTodaySessions(today)
    setActiveSession(sessions.find(s => s.endedAt === null) ?? null)

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

  async function startNewSession() {
    const id = crypto.randomUUID()
    await db.sessions.put({
      id,
      startedAt: Date.now(),
      endedAt: null,
      taps: [],
      kickCount: 0,
      goalReached: false,
    })
    navigate('/tools/kick-counter/session/' + id)
  }

  async function handleDeleteSession() {
    if (!deletingSessionId) return
    await db.sessions.delete(deletingSessionId)
    setTodaySessions(prev => prev.filter(s => s.id !== deletingSessionId))
    if (activeSession?.id === deletingSessionId) setActiveSession(null)
    setDeletingSessionId(null)
  }

  const todayKicks = todaySessions.reduce((sum, s) => sum + s.kickCount, 0)

  return (
    <div className="max-w-lg mx-auto pb-4">
      <StickyHeader>
        <div className="relative flex items-center justify-center">
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
      </StickyHeader>
      <div className="px-4">

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

      {/* Resume active session */}
      {activeSession && (
        <button
          onClick={() => navigate('/tools/kick-counter/session/' + activeSession.id)}
          className="w-full py-4 bg-duo-green hover:bg-duo-green-dark active:scale-95 text-white text-lg font-extrabold rounded-2xl border-b-4 border-duo-green-dark transition-all duration-150 mb-4 animate-pulse"
        >
          继续记录 ({activeSession.kickCount} 次胎动)
        </button>
      )}

      {/* Start Button */}
      <button
        onClick={startNewSession}
        className="w-full py-5 bg-duo-green hover:bg-duo-green-dark active:scale-95 text-white text-xl font-extrabold rounded-2xl border-b-4 border-duo-green-dark transition-all duration-150 mb-6"
      >
        开始数胎动 🦶
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
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold text-duo-green">
                      {session.kickCount}
                    </span>
                    <span className="text-xs text-gray-400">次</span>
                    {session.goalReached && <span>🎉</span>}
                  </div>
                  <button
                    onClick={() => setDeletingSessionId(session.id)}
                    className="text-gray-300 dark:text-gray-600 hover:text-duo-red dark:hover:text-duo-red active:text-duo-red transition-colors p-1 -m-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View all records */}
      <button
        onClick={() => navigate('/history')}
        className="w-full py-3.5 text-sm font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 active:scale-95 transition-transform cursor-pointer mb-6"
      >
        查看全部记录 →
      </button>

      <TipBanner />
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
