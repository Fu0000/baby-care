import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NumberField } from '@base-ui/react/number-field'
import { sileo } from 'sileo'
import { db, type FeedingRecord } from '../../../lib/db.ts'
import { triggerHaptic } from '../../../lib/haptics.ts'
import { useCurrentUserId } from '../../../lib/data-scope.ts'

export default function BottleEntry() {
  const navigate = useNavigate()
  const [volumeMl, setVolumeMl] = useState<number | null>(60)
  const userId = useCurrentUserId()

  async function handleSave() {
    if (!userId) {
      sileo.error({ title: '请先登录' })
      return
    }
    if (volumeMl === null || volumeMl <= 0) {
      sileo.error({ title: '请输入奶量' })
      return
    }
    triggerHaptic('medium')
    const now = Date.now()
    const record: FeedingRecord = {
      id: crypto.randomUUID(),
      userId,
      type: 'bottle',
      startedAt: now,
      endedAt: now,
      duration: null,
      volumeMl,
      notes: null,
    }
    await db.feedingRecords.put(record)
    sileo.success({ title: '已记录', description: `奶瓶 ${volumeMl}ml` })
    navigate('/tools/feeding-log', { replace: true })
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#1a1a2e] flex flex-col" style={{ paddingTop: 'var(--safe-area-top)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate('/tools/feeding-log', { replace: true })}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 px-3"
        >
          ← 返回
        </button>
        <h2 className="text-sm font-bold text-gray-800 dark:text-white">
          奶瓶喂养
        </h2>
        <div className="w-16" />
      </div>

      {/* Volume Entry */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <span className="text-6xl mb-6">🍼</span>
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-6">
          输入奶量
        </p>
        <NumberField.Root
          value={volumeMl}
          onValueChange={setVolumeMl}
          min={0}
          max={500}
          step={5}
        >
          <NumberField.Group className="flex items-center justify-center gap-4">
            <NumberField.Decrement className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer text-xl">
              −
            </NumberField.Decrement>
            <NumberField.Input className="w-24 text-center text-5xl font-extrabold text-duo-blue bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            <NumberField.Increment className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer text-xl">
              +
            </NumberField.Increment>
          </NumberField.Group>
        </NumberField.Root>
        <p className="text-sm text-gray-400 mt-2">ml</p>

        {/* Preset pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {[30, 60, 90, 120, 150, 180].map(ml => (
            <button
              key={ml}
              onClick={() => setVolumeMl(ml)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                volumeMl === ml
                  ? 'bg-duo-blue text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              {ml}ml
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="px-4 pb-2">
        <button
          onClick={handleSave}
          className="w-full py-5 bg-duo-blue hover:bg-duo-blue/90 active:scale-95 text-white text-xl font-extrabold rounded-2xl border-b-4 border-blue-500 transition-all duration-150"
        >
          记录完成
        </button>
      </div>
      <div style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 1rem)' }} />
    </div>
  )
}
