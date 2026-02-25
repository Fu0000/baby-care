import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NumberField } from '@base-ui/react/number-field'
import { sileo } from 'sileo'
import { db, type FeedingRecord } from '../../../lib/db.ts'
import { triggerHaptic } from '../../../lib/haptics.ts'
import {
  getFeedingLabel,
  isBreastType,
  isPumpType,
  getOppositeSide,
} from '../../../lib/feeding-helpers.ts'
import { useCurrentUserId } from '../../../lib/data-scope.ts'

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

export default function FeedingSession() {
  const navigate = useNavigate()
  const { recordId } = useParams<{ recordId: string }>()
  const userId = useCurrentUserId()
  const [record, setRecord] = useState<FeedingRecord | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [volumeMl, setVolumeMl] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    if (!recordId || !userId) {
      navigate('/tools/feeding-log', { replace: true })
      return
    }
    db.feedingRecords.get(recordId).then(r => {
      if (r && r.userId === userId) {
        setRecord(r)
        if (r.endedAt) {
          setStopped(true)
          setElapsed(r.duration ?? 0)
        }
      } else {
        navigate('/tools/feeding-log', { replace: true })
      }
    })
  }, [navigate, recordId, userId])

  // Live timer
  useEffect(() => {
    if (record && !stopped) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - record.startedAt)
      }, 100)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [record, stopped])

  async function handleStop() {
    if (!record || !userId || record.userId !== userId) return
    triggerHaptic('medium')
    const now = Date.now()
    const duration = now - record.startedAt
    const updated: FeedingRecord = {
      ...record,
      endedAt: now,
      duration,
    }
    await db.feedingRecords.put(updated)
    setRecord(updated)
    setElapsed(duration)
    setStopped(true)
  }

  async function handleSwitchSide() {
    if (!record || !userId || record.userId !== userId || !isBreastType(record.type)) return
    // End current side
    const now = Date.now()
    const duration = now - record.startedAt
    await db.feedingRecords.put({
      ...record,
      endedAt: now,
      duration,
    })

    // Start new record on opposite side
    const oppositeSide = getOppositeSide(record.type)
    if (!oppositeSide) return
    triggerHaptic('medium')
    const newId = crypto.randomUUID()
    const newRecord: FeedingRecord = {
      id: newId,
      userId,
      type: oppositeSide,
      startedAt: now,
      endedAt: null,
      duration: null,
      volumeMl: null,
      notes: null,
    }
    await db.feedingRecords.put(newRecord)
    setRecord(newRecord)
    setStopped(false)
    setElapsed(0)
    // Update URL without adding history entry
    window.history.replaceState(null, '', `#/tools/feeding-log/session/${newId}`)
    sileo.success({ title: '已切换', description: `切换到${oppositeSide === 'breast_left' ? '左侧' : '右侧'}` })
  }

  async function handleSaveVolume() {
    if (!record || !userId || record.userId !== userId) return
    triggerHaptic('light')
    await db.feedingRecords.put({
      ...record,
      volumeMl,
    })
    sileo.success({ title: '已保存' })
    navigate('/tools/feeding-log', { replace: true })
  }

  async function handleFinish() {
    if (!record || !userId || record.userId !== userId) return
    // For pump, save volume first if entered
    if (isPumpType(record.type) && volumeMl !== null) {
      await db.feedingRecords.put({
        ...record,
        volumeMl,
      })
    }
    navigate('/tools/feeding-log', { replace: true })
  }

  async function handleDiscard() {
    if (!record || !userId || record.userId !== userId) return
    await db.feedingRecords.delete(record.id)
    navigate('/tools/feeding-log', { replace: true })
  }

  if (!record) return null

  const isBreast = isBreastType(record.type)
  const isPump = isPumpType(record.type)
  const sideLabel = record.type.includes('left') ? '左侧' : record.type.includes('right') ? '右侧' : '双侧'

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#1a1a2e] flex flex-col" style={{ paddingTop: 'var(--safe-area-top)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={handleDiscard}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 px-3"
        >
          取消
        </button>
        <h2 className="text-sm font-bold text-gray-800 dark:text-white">
          {getFeedingLabel(record.type)}
        </h2>
        <div className="w-16" />
      </div>

      {!stopped ? (
        <>
          {/* Timer Display */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-4">
            <div className={`w-52 h-52 rounded-full flex flex-col items-center justify-center transition-all duration-300 relative ${
              isBreast
                ? 'bg-duo-purple/20 dark:bg-duo-purple/10'
                : 'bg-duo-orange/20 dark:bg-duo-orange/10'
            }`}>
              <div className={`absolute w-52 h-52 rounded-full animate-pulse-ring ${
                isBreast ? 'bg-duo-purple/15' : 'bg-duo-orange/15'
              }`} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {sideLabel}{isBreast ? '亲喂中' : '吸奶中'}
              </p>
              <p className={`text-5xl font-mono font-extrabold ${
                isBreast ? 'text-duo-purple' : 'text-duo-orange'
              }`}>
                {formatTimer(elapsed)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-2 space-y-2">
            {isBreast && (
              <button
                onClick={handleSwitchSide}
                className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-base font-bold rounded-2xl active:scale-95 transition-all"
              >
                🔄 换另一侧
              </button>
            )}
            <button
              onClick={handleStop}
              className={`w-full py-5 bg-duo-red hover:bg-duo-red/90 active:scale-95 text-white text-xl font-extrabold rounded-2xl border-b-4 border-red-600 transition-all duration-150`}
            >
              结束 ✋
            </button>
          </div>
          <div style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 1rem)' }} />
        </>
      ) : (
        <>
          {/* Stopped — show summary + optional volume entry for pump */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">
              {formatTimer(elapsed)}
            </p>
            <p className="text-sm text-gray-400">
              {getFeedingLabel(record.type)}
            </p>

            {/* Volume entry for pump */}
            {isPump && (
              <div className="mt-8 w-full max-w-xs">
                <p className="text-sm font-bold text-gray-800 dark:text-white text-center mb-3">
                  输入吸出奶量（可选）
                </p>
                <NumberField.Root
                  value={volumeMl}
                  onValueChange={setVolumeMl}
                  min={0}
                  max={500}
                  step={5}
                >
                  <NumberField.Group className="flex items-center justify-center gap-3">
                    <NumberField.Decrement className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer text-lg">
                      −
                    </NumberField.Decrement>
                    <NumberField.Input className="w-20 text-center text-3xl font-extrabold text-duo-orange bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <NumberField.Increment className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer text-lg">
                      +
                    </NumberField.Increment>
                  </NumberField.Group>
                </NumberField.Root>
                <p className="text-xs text-gray-400 text-center mt-1">ml</p>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {[30, 60, 90, 120, 150].map(ml => (
                    <button
                      key={ml}
                      onClick={() => setVolumeMl(ml)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-all ${
                        volumeMl === ml
                          ? 'bg-duo-orange text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {ml}ml
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Save / Done buttons */}
          <div className="px-4 pb-2">
            {isPump && volumeMl !== null ? (
              <button
                onClick={handleSaveVolume}
                className="w-full py-5 bg-duo-orange hover:bg-duo-orange/90 active:scale-95 text-white text-xl font-extrabold rounded-2xl border-b-4 border-amber-600 transition-all duration-150"
              >
                保存 {volumeMl}ml
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className={`w-full py-5 active:scale-95 text-white text-xl font-extrabold rounded-2xl border-b-4 transition-all duration-150 ${
                  isBreast
                    ? 'bg-duo-purple hover:bg-duo-purple/90 border-purple-600'
                    : 'bg-duo-orange hover:bg-duo-orange/90 border-amber-600'
                }`}
              >
                完成
              </button>
            )}
          </div>
          <div style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 1rem)' }} />
        </>
      )}
    </div>
  )
}
