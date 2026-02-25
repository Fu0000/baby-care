import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { db, type Contraction } from '../../../lib/db.ts'
import { triggerHaptic } from '../../../lib/haptics.ts'
import { formatTime } from '../../../lib/time.ts'
import { useCurrentUserId } from '../../../lib/data-scope.ts'

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}秒`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}分${sec}秒` : `${m}分`
}

export default function ContractionSession() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const userId = useCurrentUserId()
  const [contractions, setContractions] = useState<Contraction[]>([])
  const [active, setActive] = useState(false) // is a contraction happening right now?
  const [currentStart, setCurrentStart] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [showAlert, setShowAlert] = useState(false)
  const [alertTriggered, setAlertTriggered] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  // Load existing contractions for this session
  useEffect(() => {
    if (!sessionId || !userId) {
      navigate('/tools/contraction-timer', { replace: true })
      return
    }

    db.contractionSessions.get(sessionId).then((session) => {
      if (!session || session.userId !== userId) {
        navigate('/tools/contraction-timer', { replace: true })
      }
    })

    db.contractions
      .where('[userId+sessionId]')
      .equals([userId, sessionId])
      .sortBy('startedAt')
      .then(setContractions)
  }, [navigate, sessionId, userId])

  // Live timer for active contraction
  useEffect(() => {
    if (active && currentStart) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - currentStart)
      }, 100)
    } else {
      clearInterval(timerRef.current)
      setElapsed(0)
    }
    return () => clearInterval(timerRef.current)
  }, [active, currentStart])

  const updateSessionSummary = useCallback(async (contractionsList: Contraction[], alert: boolean) => {
    if (!sessionId || !userId) return
    const session = await db.contractionSessions.get(sessionId)
    if (!session || session.userId !== userId) return

    const completed = contractionsList.filter(c => c.endedAt !== null)
    const durations = completed.map(c => c.duration!).filter(Boolean)
    const intervals = completed.map(c => c.interval).filter((v): v is number => v !== null && v > 0)

    await db.contractionSessions.update(sessionId, {
      contractionCount: contractionsList.length,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      avgInterval: intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null,
      alertTriggered: alert,
    })
  }, [sessionId, userId])

  // Check 5-1-1 rule
  const check511Rule = useCallback((contractionsList: Contraction[]): boolean => {
    const completed = contractionsList.filter(c => c.endedAt !== null && c.duration !== null)
    if (completed.length < 3) return false

    // Need at least 1 hour of data
    const first = completed[0]
    const last = completed[completed.length - 1]
    if (!first || !last) return false
    const span = (last.endedAt ?? last.startedAt) - first.startedAt
    if (span < 60 * 60 * 1000) return false // less than 1 hour

    // Check last several contractions: average interval ≤ 5min, average duration ≥ 1min
    const recent = completed.slice(-6)
    const recentWithIntervals = recent.filter(c => c.interval !== null && c.interval > 0)
    if (recentWithIntervals.length < 3) return false

    const avgInterval = recentWithIntervals.reduce((s, c) => s + c.interval!, 0) / recentWithIntervals.length
    const avgDuration = recent.reduce((s, c) => s + (c.duration ?? 0), 0) / recent.length

    return avgInterval <= 5 * 60 * 1000 && avgDuration >= 60 * 1000
  }, [])

  async function handleStartContraction() {
    if (!sessionId || !userId) return
    triggerHaptic('heavy')
    const now = Date.now()
    setActive(true)
    setCurrentStart(now)

    // Calculate interval from previous contraction
    const lastContraction = contractions.length > 0 ? contractions[contractions.length - 1] : null
    const interval = lastContraction ? now - lastContraction.startedAt : null

    const newContraction: Contraction = {
      id: crypto.randomUUID(),
      userId,
      sessionId,
      startedAt: now,
      endedAt: null,
      duration: null,
      interval,
    }

    await db.contractions.put(newContraction)
    const updated = [...contractions, newContraction]
    setContractions(updated)
  }

  async function handleEndContraction() {
    if (!sessionId || !currentStart) return
    triggerHaptic('medium')
    const now = Date.now()
    const duration = now - currentStart

    setActive(false)
    setCurrentStart(null)

    // Update the last contraction
    const currentContraction = contractions[contractions.length - 1]
    if (currentContraction) {
      const updated: Contraction = {
        ...currentContraction,
        endedAt: now,
        duration,
      }
      await db.contractions.put(updated)
      const updatedList = [...contractions.slice(0, -1), updated]
      setContractions(updatedList)

      // Check 5-1-1
      const shouldAlert = check511Rule(updatedList)
      if (shouldAlert && !alertTriggered) {
        setAlertTriggered(true)
        setShowAlert(true)
        triggerHaptic('heavy')
      }

      await updateSessionSummary(updatedList, shouldAlert || alertTriggered)
    }
  }

  async function handleEndSession() {
    if (!sessionId || !userId) return
    // If currently timing, end it first
    if (active && currentStart) {
      await handleEndContraction()
    }
    const session = await db.contractionSessions.get(sessionId)
    if (!session || session.userId !== userId) return

    await db.contractionSessions.update(sessionId, {
      endedAt: Date.now(),
    })
    navigate('/tools/contraction-timer', { replace: true })
  }

  // Summary stats
  const completed = contractions.filter(c => c.endedAt !== null)
  const durations = completed.map(c => c.duration!).filter(Boolean)
  const intervals = completed.map(c => c.interval).filter((v): v is number => v !== null && v > 0)
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
  const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#1a1a2e] flex flex-col" style={{ paddingTop: 'var(--safe-area-top)' }}>
      {/* 5-1-1 AlertDialog */}
      <AlertDialog.Root open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-3rem)] max-w-sm bg-white dark:bg-[#16213e] rounded-3xl p-6 text-center animate-bounce-in outline-none">
            <div className="text-5xl mb-3">🏥</div>
            <AlertDialog.Title className="text-2xl font-extrabold text-duo-red mb-2">
              该去医院了！
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              宫缩符合 5-1-1 规则：间隔约 5 分钟，持续约 1 分钟，已持续超过 1 小时。
            </AlertDialog.Description>
            <p className="text-xs text-gray-400 mb-6">
              请联系您的医生或前往医院。
            </p>
            <AlertDialog.Close className="w-full py-3 bg-duo-red text-white font-bold rounded-2xl active:scale-95 transition-transform cursor-pointer">
              我知道了
            </AlertDialog.Close>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={handleEndSession}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 px-3"
        >
          ← 结束
        </button>
        <h2 className="text-sm font-bold text-gray-800 dark:text-white">
          宫缩计时
        </h2>
        <div className="w-16" />
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-4">
        {/* Live Timer */}
        <div className={`w-52 h-52 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
          active
            ? 'bg-duo-orange/20 dark:bg-duo-orange/10'
            : 'bg-gray-100 dark:bg-[#16213e]'
        }`}>
          {active && (
            <div className="absolute w-52 h-52 rounded-full bg-duo-orange/15 animate-pulse-ring" />
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {active ? '宫缩中' : '等待宫缩'}
          </p>
          <p className={`text-5xl font-mono font-extrabold ${
            active ? 'text-duo-orange' : 'text-gray-300 dark:text-gray-600'
          }`}>
            {active ? formatTimer(elapsed) : '00:00'}
          </p>
          {active && elapsed >= 60000 && (
            <p className="text-xs text-duo-orange mt-1 font-bold">已超过 1 分钟</p>
          )}
        </div>

        {/* Count */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          第 <span className="font-extrabold text-duo-orange text-lg">{contractions.length + (active ? 0 : 0)}</span> 次宫缩
        </p>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-2">
        {!active ? (
          <button
            onClick={handleStartContraction}
            className="w-full py-5 bg-duo-orange hover:bg-duo-orange/90 active:scale-95 text-white text-xl font-extrabold rounded-2xl border-b-4 border-amber-600 transition-all duration-150"
          >
            开始宫缩 💪
          </button>
        ) : (
          <button
            onClick={handleEndContraction}
            className="w-full py-5 bg-duo-red hover:bg-duo-red/90 active:scale-95 text-white text-xl font-extrabold rounded-2xl border-b-4 border-red-600 transition-all duration-150"
          >
            宫缩结束 ✋
          </button>
        )}
      </div>

      {/* Summary Stats */}
      {completed.length > 0 && (
        <div className="px-4 py-3">
          <div className="bg-gray-50 dark:bg-[#16213e] rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-extrabold text-duo-orange">{completed.length}</p>
                <p className="text-xs text-gray-400">总次数</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-duo-blue">{formatMs(avgDuration)}</p>
                <p className="text-xs text-gray-400">平均时长</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-duo-purple">{intervals.length > 0 ? formatMs(avgInterval) : '--'}</p>
                <p className="text-xs text-gray-400">平均间隔</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contraction History */}
      <div className="px-4 pb-4 overflow-y-auto max-h-48" style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 1rem)' }}>
        {[...contractions].reverse().map((c, i) => (
          <div
            key={c.id}
            className={`flex items-center justify-between py-2.5 ${
              i < contractions.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${
                c.endedAt ? 'bg-duo-orange' : 'bg-duo-red animate-pulse'
              }`} />
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">
                  {formatTime(c.startedAt)}
                  {c.endedAt && (
                    <span className="text-gray-400 font-normal"> → {formatTime(c.endedAt)}</span>
                  )}
                </p>
                {c.interval !== null && c.interval > 0 && (
                  <p className="text-xs text-gray-400">
                    间隔 {formatMs(c.interval)}
                  </p>
                )}
              </div>
            </div>
            <span className="text-sm font-bold text-duo-orange">
              {c.duration ? formatMs(c.duration) : (c.endedAt === null ? '进行中...' : '--')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
