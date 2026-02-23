import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '@base-ui/react/dialog'
import StickyHeader from '../../../components/StickyHeader.tsx'
import { db, type FeedingRecord, type FeedingType } from '../../../lib/db.ts'
import { formatTime, isSameDay } from '../../../lib/time.ts'
import {
  getFeedingLabel,
  getFeedingEmoji,
  getFeedingColor,
  getFeedingBgColor,
  suggestBreastSide,
  suggestPumpSide,
  formatFeedingDuration,
  formatTimeSinceLastFeed,
  getTodaySummary,
} from '../../../lib/feeding-helpers.ts'

export default function FeedingLogHome() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<FeedingRecord[]>([])
  const [showBreastPicker, setShowBreastPicker] = useState(false)
  const [showPumpPicker, setShowPumpPicker] = useState(false)

  useEffect(() => {
    loadRecords()
  }, [])

  async function loadRecords() {
    const all = await db.feedingRecords.orderBy('startedAt').reverse().toArray()
    setRecords(all)
  }

  const activeRecord = records.find(r => r.endedAt === null && r.type !== 'bottle')
  const todayRecords = records.filter(r => isSameDay(r.startedAt, Date.now()))
  const summary = getTodaySummary(todayRecords)
  const lastFeed = records.length > 0 ? records[0] : null

  const suggestedBreast = suggestBreastSide(records)
  const suggestedPump = suggestPumpSide(records)

  function startBreastFeeding(side: FeedingType) {
    setShowBreastPicker(false)
    const id = crypto.randomUUID()
    const record: FeedingRecord = {
      id,
      type: side,
      startedAt: Date.now(),
      endedAt: null,
      duration: null,
      volumeMl: null,
      notes: null,
    }
    db.feedingRecords.put(record).then(() => {
      navigate(`/tools/feeding-log/session/${id}`)
    })
  }

  function startPumping(side: FeedingType) {
    setShowPumpPicker(false)
    const id = crypto.randomUUID()
    const record: FeedingRecord = {
      id,
      type: side,
      startedAt: Date.now(),
      endedAt: null,
      duration: null,
      volumeMl: null,
      notes: null,
    }
    db.feedingRecords.put(record).then(() => {
      navigate(`/tools/feeding-log/session/${id}`)
    })
  }

  // Recent records (last 10 completed)
  const recentRecords = records.filter(r => r.endedAt !== null || r.type === 'bottle').slice(0, 10)

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
            喂奶记录
          </h1>
        </div>
      </StickyHeader>
      <div className="px-4">

      {/* Active session banner */}
      {activeRecord && (
        <button
          onClick={() => navigate(`/tools/feeding-log/session/${activeRecord.id}`)}
          className="w-full py-4 bg-duo-purple hover:bg-duo-purple/90 active:scale-95 text-white text-lg font-extrabold rounded-2xl border-b-4 border-purple-600 transition-all duration-150 mb-4"
        >
          <span className="inline-block animate-pulse mr-2">⏱</span>
          继续 {getFeedingLabel(activeRecord.type)}
        </button>
      )}

      {/* Today summary card */}
      <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60 mb-4">
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          今日统计
        </p>
        {summary.totalCount === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">今天还没有喂奶记录</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-extrabold text-duo-purple">{summary.totalCount}</p>
              <p className="text-xs text-gray-400">总次数</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-duo-blue">
                {summary.totalVolumeMl > 0 ? `${summary.totalVolumeMl}` : '--'}
              </p>
              <p className="text-xs text-gray-400">{summary.totalVolumeMl > 0 ? 'ml' : '奶量'}</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-duo-orange">
                {summary.totalBreastMinutes > 0 ? `${summary.totalBreastMinutes}` : '--'}
              </p>
              <p className="text-xs text-gray-400">{summary.totalBreastMinutes > 0 ? '分钟亲喂' : '亲喂'}</p>
            </div>
          </div>
        )}
        {lastFeed && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/40">
            <p className="text-xs text-gray-400">
              距上次喂奶 <span className="font-bold text-gray-600 dark:text-gray-300">{formatTimeSinceLastFeed(lastFeed.startedAt)}</span>
            </p>
          </div>
        )}
      </div>

      {/* 3 CTA buttons */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {/* Breast */}
        <Dialog.Root open={showBreastPicker} onOpenChange={setShowBreastPicker}>
          <Dialog.Trigger className="flex flex-col items-center justify-center py-5 bg-duo-purple/10 dark:bg-duo-purple/15 rounded-2xl active:scale-95 transition-all cursor-pointer">
            <span className="text-2xl mb-1">🤱</span>
            <p className="text-sm font-bold text-duo-purple">亲喂</p>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <Dialog.Popup className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#16213e] rounded-t-3xl px-4 pt-5 transition-all duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full outline-none" style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 2rem)' }}>
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
              <Dialog.Title className="text-lg font-extrabold text-gray-800 dark:text-white text-center mb-2">
                选择亲喂侧
              </Dialog.Title>
              <p className="text-xs text-gray-400 text-center mb-5">
                建议：{suggestedBreast === 'breast_left' ? '左侧' : '右侧'}（上次在另一侧）
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startBreastFeeding('breast_left')}
                  className={`py-5 rounded-2xl text-lg font-extrabold transition-all active:scale-95 ${
                    suggestedBreast === 'breast_left'
                      ? 'bg-duo-purple text-white border-b-4 border-purple-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  🤱 左侧
                </button>
                <button
                  onClick={() => startBreastFeeding('breast_right')}
                  className={`py-5 rounded-2xl text-lg font-extrabold transition-all active:scale-95 ${
                    suggestedBreast === 'breast_right'
                      ? 'bg-duo-purple text-white border-b-4 border-purple-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  🤱 右侧
                </button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Bottle */}
        <button
          onClick={() => navigate('/tools/feeding-log/bottle')}
          className="flex flex-col items-center justify-center py-5 bg-duo-blue/10 dark:bg-duo-blue/15 rounded-2xl active:scale-95 transition-all"
        >
          <span className="text-2xl mb-1">🍼</span>
          <p className="text-sm font-bold text-duo-blue">奶瓶</p>
        </button>

        {/* Pump */}
        <Dialog.Root open={showPumpPicker} onOpenChange={setShowPumpPicker}>
          <Dialog.Trigger className="flex flex-col items-center justify-center py-5 bg-duo-orange/10 dark:bg-duo-orange/15 rounded-2xl active:scale-95 transition-all cursor-pointer">
            <span className="text-2xl mb-1">🧴</span>
            <p className="text-sm font-bold text-duo-orange">吸奶</p>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <Dialog.Popup className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#16213e] rounded-t-3xl px-4 pt-5 transition-all duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full outline-none" style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 2rem)' }}>
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
              <Dialog.Title className="text-lg font-extrabold text-gray-800 dark:text-white text-center mb-2">
                选择吸奶方式
              </Dialog.Title>
              <div className="grid grid-cols-3 gap-2">
                {(['pump_left', 'pump_right', 'pump_both'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => startPumping(type)}
                    className={`py-5 rounded-2xl text-base font-extrabold transition-all active:scale-95 ${
                      suggestedPump === type
                        ? 'bg-duo-orange text-white border-b-4 border-amber-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {type === 'pump_left' ? '左侧' : type === 'pump_right' ? '右侧' : '双侧'}
                  </button>
                ))}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Recent records */}
      {recentRecords.length > 0 && (
        <>
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            最近记录
          </p>
          <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
            {recentRecords.map((record, idx) => (
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
                        {record.duration ? ` · ${formatFeedingDuration(record.duration)}` : ''}
                        {record.volumeMl ? ` · ${record.volumeMl}ml` : ''}
                      </p>
                    </div>
                  </div>
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
            ))}
          </div>
        </>
      )}

      {records.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🍼</div>
          <p className="text-gray-400 dark:text-gray-500 font-bold">还没有喂奶记录</p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">选择上方喂奶方式开始记录</p>
        </div>
      )}
      </div>
    </div>
  )
}
