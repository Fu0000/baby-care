import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { Dialog } from '@base-ui/react/dialog'
import { Progress } from '@base-ui/react/progress'
import { IconChildHeadOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { db, type Tap } from '../../../lib/db.ts'
import { getSettings } from '../../../lib/settings.ts'
import { formatDuration, formatShortDuration } from '../../../lib/time.ts'
import { triggerHaptic } from '../../../lib/haptics.ts'
import { getEncouragement } from '../../../lib/encouragements.ts'
import { getRandomTip } from '../../../lib/tips.ts'
import { Liveline } from 'liveline'
import ProgressRing from '../../../components/ProgressRing.tsx'

export default function KickSession() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const settings = getSettings()
  const mergeWindowMs = settings.mergeWindowMinutes * 60 * 1000

  const [loaded, setLoaded] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
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

  const isDark = document.documentElement.classList.contains('dark')
  const chartData = useMemo(() => {
    const points: { time: number; value: number }[] = [
      { time: Math.floor(startedAt / 1000), value: 0 },
    ]
    let cumulative = 0
    let lastWindowId = -1
    for (const tap of taps) {
      if (tap.windowId !== lastWindowId) {
        cumulative++
        lastWindowId = tap.windowId
      }
      points.push({ time: Math.floor(tap.timestamp / 1000), value: cumulative })
    }
    return points
  }, [taps, startedAt])

  // Load session from DB on mount
  useEffect(() => {
    if (!sessionId) return
    db.sessions.get(sessionId).then(session => {
      if (session) {
        setStartedAt(session.startedAt)
        setTaps(session.taps)
        setKickCount(session.kickCount)
        setGoalReached(session.goalReached)
        // Restore merge window state from existing taps
        if (session.taps.length > 0) {
          const maxWindowId = session.taps.reduce((max, t) => Math.max(max, t.windowId), 0)
          currentWindowId.current = maxWindowId
          const firstTapInWindow = session.taps.find(t => t.windowId === maxWindowId)
          if (firstTapInWindow && Date.now() - firstTapInWindow.timestamp < mergeWindowMs) {
            windowStartTime.current = firstTapInWindow.timestamp
            setWindowActive(true)
            setWindowTapCount(session.taps.filter(t => t.windowId === maxWindowId).length)
          }
        }
      }
      setLoaded(true)
    })
  }, [sessionId])

  // Elapsed timer
  useEffect(() => {
    if (!loaded || startedAt === 0) return
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt)
    }, 200)
    return () => clearInterval(interval)
  }, [loaded, startedAt])

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
    if (!sessionId) return
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

  if (!loaded) return null

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#1a1a2e] flex flex-col" style={{ paddingTop: 'var(--safe-area-top)' }}>
      {/* Completion Dialog */}
      <Dialog.Root
        open={showCompletion}
        onOpenChange={(open) => {
          if (!open) handleCompletionDone()
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-white dark:bg-[#1a1a2e]" />
          <Dialog.Popup className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 animate-bounce-in outline-none">
            <div className="text-6xl mb-4">🎉</div>
            <Dialog.Title className="text-3xl font-extrabold text-duo-green mb-2">太棒了！</Dialog.Title>
            <Dialog.Description className="text-center mb-8">
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                达到 {settings.goalCount} 次胎动目标！
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                用时 {formatDuration(elapsed)}
              </p>
            </Dialog.Description>

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

            <Dialog.Close
              onClick={handleCompletionDone}
              className="w-full max-w-sm py-4 bg-duo-green text-white text-lg font-extrabold rounded-2xl border-b-4 border-duo-green-dark active:scale-95 transition-transform cursor-pointer"
            >
              完成 ✨
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Header */}
      <div className="px-4 py-3">
        <div className="relative flex items-center justify-center">
          <button
            onClick={async () => {
              await saveSession(false)
              navigate('/tools/kick-counter', { replace: true })
            }}
            className="absolute left-0 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 pr-2"
          >
            ← 返回
          </button>
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-gray-800 dark:text-white">数胎动</h1>
            <p className="text-sm font-mono text-gray-400 dark:text-gray-500 mt-0.5">
              {formatDuration(elapsed)}
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-1">
          随时离开，稍后继续
        </p>
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
              <IconChildHeadOutlineDuo18 size={48} className="mb-1 text-duo-green" />
              <span className="text-4xl font-extrabold text-duo-green">
                ×{kickCount}
              </span>
            </div>
          </ProgressRing>
        </button>

        <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
          点击记录胎动
        </p>

        {/* Live kick timeline */}
        <div className="w-full px-2 mt-2 mb-0" style={{ height: 100 }}>
          <Liveline
            data={chartData}
            value={kickCount}
            color="#58CC02"
            theme={isDark ? 'dark' : 'light'}
            referenceLine={{ value: settings.goalCount, label: '目标' }}
            formatValue={(v) => Math.round(v) + ''}
            grid={false}
            fill
            scrub={false}
            badge={false}
            pulse={false}
            momentum={false}
            exaggerate
            padding={{ top: 8, right: 12, bottom: 20, left: 12 }}
          />
        </div>
      </div>

      {/* Bottom Info */}
      <div className="px-4 pb-28 mt-2">
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
        <Progress.Root value={kickCount} max={settings.goalCount} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            目标 {settings.goalCount}
          </span>
          <Progress.Track className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <Progress.Indicator className="h-full bg-duo-green rounded-full transition-all duration-500 ease-out" />
          </Progress.Track>
          <span className="text-sm font-extrabold text-duo-green shrink-0">
            {kickCount}
          </span>
        </Progress.Root>
      </div>

      {/* Gradient fade mask */}
      <div className="fixed bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white dark:from-[#1a1a2e] to-transparent pointer-events-none z-40" />

      {/* Floating stop button */}
      <div className="fixed bottom-4 pwa:bottom-4 inset-x-0 z-50 px-6" style={{ paddingBottom: 'var(--safe-area-bottom)' }}>
        <button
          onClick={handleEnd}
          className="w-full py-5 bg-duo-red text-white text-xl font-extrabold rounded-2xl border-b-4 border-red-700 active:scale-95 transition-all"
        >
          结束记录
        </button>
      </div>
    </div>
  )
}
