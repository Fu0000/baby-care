import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { db, type Tap } from '../../../lib/db.ts'
import { getSettings } from '../../../lib/settings.ts'
import { formatDuration, formatShortDuration } from '../../../lib/time.ts'
import { triggerHaptic } from '../../../lib/haptics.ts'
import { getEncouragement } from '../../../lib/encouragements.ts'
import { getRandomTip } from '../../../lib/tips.ts'
import ProgressRing from '../../../components/ProgressRing.tsx'

export default function KickSession() {
  const navigate = useNavigate()
  const settings = getSettings()
  const mergeWindowMs = settings.mergeWindowMinutes * 60 * 1000

  const [sessionId] = useState(() => crypto.randomUUID())
  const [startedAt] = useState(() => Date.now())
  const [taps, setTaps] = useState<Tap[]>([])
  const [kickCount, setKickCount] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [windowRemaining, setWindowRemaining] = useState(0)
  const [windowActive, setWindowActive] = useState(false)
  const [windowTapCount, setWindowTapCount] = useState(0)
  const [encouragement, setEncouragement] = useState('')
  const [showEncouragement, setShowEncouragement] = useState(false)
  const [goalReached, setGoalReached] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [completionTip, setCompletionTip] = useState('')

  const currentWindowId = useRef(0)
  const windowStartTime = useRef(0)
  const encourageTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt)
    }, 200)
    return () => clearInterval(interval)
  }, [startedAt])

  // Window countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (windowActive && windowStartTime.current > 0) {
        const remaining = mergeWindowMs - (Date.now() - windowStartTime.current)
        if (remaining <= 0) {
          setWindowActive(false)
          setWindowRemaining(0)
          setWindowTapCount(0)
        } else {
          setWindowRemaining(remaining)
        }
      }
    }, 200)
    return () => clearInterval(interval)
  }, [windowActive, mergeWindowMs])

  // Save session to DB periodically
  useEffect(() => {
    const interval = setInterval(() => {
      saveSession(false)
    }, 5000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taps, kickCount])

  const saveSession = useCallback(async (ended: boolean) => {
    await db.sessions.put({
      id: sessionId,
      startedAt,
      endedAt: ended ? Date.now() : null,
      taps,
      kickCount,
      goalReached,
    })
  }, [sessionId, startedAt, taps, kickCount, goalReached])

  function handleTap() {
    if (goalReached) return

    triggerHaptic('medium')
    const now = Date.now()

    let newKickCount = kickCount

    if (!windowActive) {
      // Start new merge window
      currentWindowId.current += 1
      windowStartTime.current = now
      setWindowActive(true)
      newKickCount = kickCount + 1
      setKickCount(newKickCount)
      setWindowTapCount(1)
    } else {
      // Within existing window - just count the tap
      setWindowTapCount(prev => prev + 1)
    }

    const newTap: Tap = {
      timestamp: now,
      windowId: currentWindowId.current,
    }
    const newTaps = [...taps, newTap]
    setTaps(newTaps)

    // Show encouragement
    setEncouragement(getEncouragement())
    setShowEncouragement(true)
    clearTimeout(encourageTimer.current)
    encourageTimer.current = setTimeout(() => setShowEncouragement(false), 1500)

    // Check goal
    if (newKickCount >= settings.goalCount && !goalReached) {
      setGoalReached(true)
      setCompletionTip(getRandomTip())
      triggerHaptic('heavy')

      // Fire confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#58CC02', '#FFC800', '#FF9600', '#CE82FF', '#1CB0F6'],
      })

      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#58CC02', '#FFC800', '#FF9600'],
        })
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#CE82FF', '#1CB0F6', '#FF4B4B'],
        })
      }, 500)

      setTimeout(() => setShowCompletion(true), 1200)
    }
  }

  async function handleEnd() {
    await saveSession(true)
    navigate('/tools/kick-counter', { replace: true })
  }

  async function handleCompletionDone() {
    await saveSession(true)
    navigate('/tools/kick-counter', { replace: true })
  }

  const progress = Math.min(kickCount / settings.goalCount, 1)

  // Completion overlay
  if (showCompletion) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-[#1a1a2e] z-50 flex flex-col items-center justify-center px-6 animate-bounce-in">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-extrabold text-duo-green mb-2">太棒了！</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
          达到 {settings.goalCount} 次胎动目标！
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
          用时 {formatDuration(elapsed)}
        </p>

        {/* Summary Card */}
        <div className="bg-gray-50 dark:bg-[#16213e] rounded-3xl p-6 w-full max-w-sm mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-extrabold text-duo-green">{kickCount}</p>
              <p className="text-xs text-gray-400">有效胎动</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-duo-blue">{taps.length}</p>
              <p className="text-xs text-gray-400">总点击数</p>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="bg-duo-yellow/20 dark:bg-duo-yellow/10 rounded-2xl p-4 w-full max-w-sm mb-8">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div>
              <p className="text-xs font-bold text-duo-orange mb-1">小贴士</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{completionTip}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleCompletionDone}
          className="w-full max-w-sm py-4 bg-duo-green text-white text-lg font-extrabold rounded-2xl border-b-4 border-duo-green-dark active:scale-95 transition-transform"
        >
          完成 ✨
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#1a1a2e] flex flex-col" style={{ paddingTop: 'var(--safe-area-top)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={handleEnd}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 px-3"
        >
          ← 返回
        </button>
        <div className="text-center">
          <p className="text-xs text-gray-400">已用时间</p>
          <p className="text-lg font-mono font-bold text-gray-800 dark:text-white">
            {formatDuration(elapsed)}
          </p>
        </div>
        <div className="w-16" />
      </div>

      {/* Main Tap Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-8">
        {/* Encouragement */}
        <div className="h-8 mb-2">
          {showEncouragement && (
            <p className="text-lg font-bold text-duo-orange animate-bounce-in">
              {encouragement}
            </p>
          )}
        </div>

        {/* Big Tap Button with Progress Ring */}
        <button
          onClick={handleTap}
          className="relative active:scale-90 transition-transform duration-150 select-none"
          disabled={goalReached}
        >
          {/* Pulse ring on active window */}
          {windowActive && (
            <div className="absolute inset-0 rounded-full bg-duo-green/20 animate-pulse-ring" />
          )}
          <ProgressRing progress={progress} size={220} strokeWidth={10}>
            <div className="flex flex-col items-center">
              <span className="text-5xl mb-1">🦶</span>
              <span className="text-4xl font-extrabold text-duo-green">
                ×{kickCount}
              </span>
            </div>
          </ProgressRing>
        </button>

        <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
          点击记录胎动
        </p>
      </div>

      {/* Bottom Info */}
      <div className="px-4 pb-6" style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 1.5rem)' }}>
        {/* Merge Window Status */}
        <div className={`rounded-2xl p-4 mb-4 transition-colors ${
          windowActive
            ? 'bg-duo-green/10 dark:bg-duo-green/5'
            : 'bg-gray-100 dark:bg-[#16213e]'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${windowActive ? 'bg-duo-green' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {windowActive ? '合并窗口 · 活跃中' : '等待点击'}
              </span>
            </div>
            {windowActive && (
              <span className="text-sm font-mono text-duo-green font-bold">
                剩余 {formatShortDuration(windowRemaining)}
              </span>
            )}
          </div>
          {windowActive && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              本窗口点击: {windowTapCount} 次（合并为 1 次有效胎动）
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            目标 {settings.goalCount}
          </span>
          <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-duo-green rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-sm font-extrabold text-duo-green shrink-0">
            {kickCount}
          </span>
        </div>

        {/* End Button */}
        <button
          onClick={handleEnd}
          className="w-full mt-4 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-[#16213e] transition-colors"
        >
          结束记录
        </button>
      </div>
    </div>
  )
}
