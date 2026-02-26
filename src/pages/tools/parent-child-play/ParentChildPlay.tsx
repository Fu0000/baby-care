import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sileo } from 'sileo'
import StickyHeader from '../../../components/StickyHeader.tsx'
import { useCurrentUserId } from '../../../lib/data-scope.ts'
import { getSettings } from '../../../lib/settings.ts'
import {
  getParentChildDailyStats,
  getParentChildRecommendation,
  getParentChildRecentStats,
} from '../../../lib/parent-child-play.ts'

type NoisePresetId = 'soft' | 'medium' | 'focus'
type GameMode = 'chase' | 'rhythm'

const NOISE_PRESETS: { id: NoisePresetId; label: string; volume: number }[] = [
  { id: 'soft', label: '轻柔', volume: 0.05 },
  { id: 'medium', label: '舒缓', volume: 0.1 },
  { id: 'focus', label: '稳定', volume: 0.16 },
]

const TIMER_OPTIONS: { label: string; seconds: number }[] = [
  { label: '5分钟', seconds: 300 },
  { label: '10分钟', seconds: 600 },
  { label: '20分钟', seconds: 1200 },
]

const PLAY_MODES: { id: GameMode; label: string; subtitle: string; tip: string }[] =
  [
    {
      id: 'chase',
      label: '追光模式',
      subtitle: '找准目标，提升专注与反应',
      tip: '适合精神状态不错时，短时快速互动。',
    },
    {
      id: 'rhythm',
      label: '节奏模式',
      subtitle: '跟拍互动，训练节奏同步',
      tip: '更稳定、更容易上手，适合日常推荐。',
    },
  ]

const VISUAL_CARDS: {
  title: string
  subtitle: string
  tip: string
  type: 'rings' | 'stripes' | 'target' | 'faces'
}[] = [
  {
    title: '黑白同心环',
    subtitle: '适合 0-3 月追视训练',
    tip: '慢慢左右移动 15-20cm，引导宝宝短时跟随。',
    type: 'rings',
  },
  {
    title: '高对比条纹',
    subtitle: '帮助集中视线与跟随',
    tip: '每次停留 3-5 秒，再切换方向。',
    type: 'stripes',
  },
  {
    title: '中心注视点',
    subtitle: '短时注视练习（每次 10-20 秒）',
    tip: '观察宝宝疲劳信号，随时暂停。',
    type: 'target',
  },
  {
    title: '笑脸识别',
    subtitle: '轻度情绪互动与注视转移',
    tip: '可以边说话边切换表情，增强回应。',
    type: 'faces',
  },
]

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatSecondsAsZh(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  if (m > 0 && s > 0) return `${m}分${s}秒`
  if (m > 0) return `${m}分钟`
  return `${s}秒`
}

function getNoiseVolume(id: NoisePresetId): number {
  return NOISE_PRESETS.find((preset) => preset.id === id)?.volume ?? 0.08
}

export default function ParentChildPlay() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()

  const [settingsSnapshot] = useState(() => getSettings())
  const lowStimulus = settingsSnapshot.comfortMode || settingsSnapshot.motionLevel === 'low'
  const recommendation = useMemo(
    () => getParentChildRecommendation(settingsSnapshot.userStage, lowStimulus),
    [lowStimulus, settingsSnapshot.userStage],
  )

  const [dailyStats, setDailyStats] = useState(() => getParentChildDailyStats(userId))
  const [recentStats, setRecentStats] = useState(() => getParentChildRecentStats(userId, 7))

  const refreshInteractionStats = useCallback(() => {
    setDailyStats(getParentChildDailyStats(userId))
    setRecentStats(getParentChildRecentStats(userId, 7))
  }, [userId])

  useEffect(() => {
    const id = window.setTimeout(() => refreshInteractionStats(), 0)
    return () => window.clearTimeout(id)
  }, [refreshInteractionStats])

  useEffect(() => {
    function handleRefresh() {
      if (document.visibilityState && document.visibilityState !== 'visible') return
      refreshInteractionStats()
    }

    window.addEventListener('focus', handleRefresh)
    document.addEventListener('visibilitychange', handleRefresh)
    return () => {
      window.removeEventListener('focus', handleRefresh)
      document.removeEventListener('visibilitychange', handleRefresh)
    }
  }, [refreshInteractionStats])

  const todayDurationTargetSeconds = recommendation.dailyTargetMinutes * 60
  const todayDurationProgress = Math.min(
    100,
    Math.round(
      (dailyStats.totalDurationSeconds / Math.max(todayDurationTargetSeconds, 1)) * 100,
    ),
  )
  const todaySessionProgress = Math.min(
    100,
    Math.round(
      (dailyStats.totalSessions / Math.max(recommendation.dailyTargetSessions, 1)) * 100,
    ),
  )
  const recentAverageSeconds = Math.round(
    recentStats.totalDurationSeconds / Math.max(recentStats.days, 1),
  )

  const [noisePreset, setNoisePreset] = useState<NoisePresetId>('medium')
  const [noiseTimerSeconds, setNoiseTimerSeconds] = useState(600)
  const [noiseRunning, setNoiseRunning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const [cardIndex, setCardIndex] = useState(0)
  const [cardsAutoPlay, setCardsAutoPlay] = useState(!lowStimulus)
  const currentCard = VISUAL_CARDS[cardIndex]

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const noiseGainRef = useRef<GainNode | null>(null)
  const stopTimeoutRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)

  const stopNoise = useCallback((): void => {
    if (sourceRef.current) {
      sourceRef.current.stop()
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (noiseGainRef.current) {
      noiseGainRef.current.disconnect()
      noiseGainRef.current = null
    }
    if (stopTimeoutRef.current !== null) {
      window.clearTimeout(stopTimeoutRef.current)
      stopTimeoutRef.current = null
    }
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setNoiseRunning(false)
    setRemainingSeconds(0)
  }, [])

  useEffect(() => {
    if (!cardsAutoPlay) return
    const timer = window.setInterval(() => {
      setCardIndex((previous) => (previous + 1) % VISUAL_CARDS.length)
    }, lowStimulus ? 6500 : 4500)

    return () => window.clearInterval(timer)
  }, [cardsAutoPlay, lowStimulus])

  useEffect(() => {
    if (!noiseRunning || !noiseGainRef.current) return
    noiseGainRef.current.gain.value = getNoiseVolume(noisePreset)
  }, [noisePreset, noiseRunning])

  useEffect(() => {
    return () => {
      stopNoise()
      if (audioContextRef.current) void audioContextRef.current.close()
    }
  }, [stopNoise])

  async function ensureAudioReady(): Promise<AudioContext | null> {
    if (typeof window === 'undefined' || !window.AudioContext) return null
    const context = audioContextRef.current ?? new AudioContext()
    if (!audioContextRef.current) audioContextRef.current = context
    if (context.state === 'suspended') await context.resume()
    return context
  }

  async function startNoise(): Promise<void> {
    try {
      const context = await ensureAudioReady()
      if (!context) {
        sileo.error({ title: '当前设备不支持白噪音播放' })
        return
      }

      stopNoise()

      const source = context.createBufferSource()
      source.buffer = createNoiseBuffer(context)
      source.loop = true

      const gain = context.createGain()
      gain.gain.value = getNoiseVolume(noisePreset)
      source.connect(gain)
      gain.connect(context.destination)
      source.start()

      sourceRef.current = source
      noiseGainRef.current = gain
      setNoiseRunning(true)
      setRemainingSeconds(noiseTimerSeconds)

      if (noiseTimerSeconds > 0) {
        stopTimeoutRef.current = window.setTimeout(() => stopNoise(), noiseTimerSeconds * 1000)
        countdownRef.current = window.setInterval(() => {
          setRemainingSeconds((previous) => (previous > 0 ? previous - 1 : 0))
        }, 1000)
      }
    } catch {
      sileo.error({ title: '白噪音启动失败，请稍后重试' })
    }
  }

  const visualPreview = useMemo(() => {
    if (currentCard.type === 'rings') {
      return (
        <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700/60">
          <div
            className={`absolute inset-0 ${lowStimulus ? '' : 'animate-float'}`}
            style={{
              background:
                'radial-gradient(circle at center, #000 0 11%, #fff 11% 22%, #000 22% 33%, #fff 33% 44%, #000 44% 55%, #fff 55% 66%, #000 66% 100%)',
            }}
          />
          {!lowStimulus && (
            <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70 animate-pulse-ring" />
          )}
        </div>
      )
    }

    if (currentCard.type === 'stripes') {
      return (
        <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700/60">
          <div
            className="absolute inset-0"
            style={{
              background: 'repeating-linear-gradient(90deg, #000 0 16px, #fff 16px 32px)',
            }}
          />
          <div
            className={`absolute top-0 h-full w-10 bg-white/25 ${lowStimulus ? '' : 'animate-pulse'}`}
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          />
        </div>
      )
    }

    if (currentCard.type === 'target') {
      return (
        <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#0f1629]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`h-24 w-24 rounded-full border-4 border-black dark:border-white ${
                lowStimulus ? '' : 'animate-pulse'
              }`}
            />
            <div className="absolute h-10 w-10 rounded-full bg-black dark:bg-white" />
          </div>
        </div>
      )
    }

    return (
      <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#0f1629]">
        <div className={`absolute inset-0 flex items-center justify-center ${lowStimulus ? '' : 'animate-slide-up'}`}>
          <div className="text-[90px] leading-none">😊</div>
        </div>
        {!lowStimulus && (
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 text-xs font-bold text-gray-500">
            <span className="h-2 w-2 rounded-full bg-duo-green animate-pulse" />
            观察宝宝是否愿意跟随表情
          </div>
        )}
      </div>
    )
  }, [currentCard.type, lowStimulus])

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
            亲子互动
          </h1>
        </div>
      </StickyHeader>

      <div className="px-4 space-y-6 pb-4">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className="text-sm font-extrabold text-duo-purple">总览</p>
          <p className="text-lg font-extrabold text-gray-800 dark:text-white mt-1">
            {recommendation.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {recommendation.subtitle}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <StatBadge
              label="推荐玩法"
              valueText={recommendation.gameMode === 'chase' ? '追光' : '节奏'}
              tone="text-duo-orange"
            />
            <StatBadge
              label="推荐时长"
              valueText={`${recommendation.durationSeconds}s`}
              tone="text-duo-blue"
            />
            <StatBadge
              label="今日目标"
              valueText={`${recommendation.dailyTargetSessions}场 / ${recommendation.dailyTargetMinutes}分`}
              tone="text-duo-green"
            />
          </div>
          <button
            onClick={() => navigate(`/tools/parent-child-play/game/${recommendation.gameMode}`)}
            className="w-full mt-4 rounded-xl py-3 text-sm font-extrabold text-white bg-duo-orange border-b-4 border-amber-600 active:scale-95 transition-transform"
          >
            开始推荐玩法
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            互动记录统计
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatBadge
              label="今日时长"
              valueText={formatSecondsAsZh(dailyStats.totalDurationSeconds)}
              tone="text-duo-blue"
            />
            <StatBadge
              label="今日完成率"
              valueText={`${dailyStats.completionRate}%`}
              tone="text-duo-green"
            />
            <StatBadge
              label="今日场次"
              valueText={`${dailyStats.completedSessions}/${dailyStats.totalSessions}`}
              tone="text-duo-orange"
            />
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                <span>时长达标度</span>
                <span>{todayDurationProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-duo-blue transition-all duration-300"
                  style={{ width: `${todayDurationProgress}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                <span>场次达标度</span>
                <span>{todaySessionProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-duo-green transition-all duration-300"
                  style={{ width: `${todaySessionProgress}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            近 {recentStats.days} 天：累计 {recentStats.totalSessions} 场，完成率{' '}
            {recentStats.completionRate}% ，日均互动 {formatSecondsAsZh(recentAverageSeconds)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            游戏入口
          </p>
          <div className="space-y-3">
            {PLAY_MODES.map((mode) => {
              const isRecommended = recommendation.gameMode === mode.id
              return (
                <div
                  key={mode.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-[#0f1629] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-gray-800 dark:text-white">
                        {mode.label}{' '}
                        {isRecommended && (
                          <span className="ml-1 text-xs font-bold text-duo-orange">
                            推荐
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {mode.subtitle}
                      </p>
                      <p className="text-xs text-duo-blue font-bold mt-2">
                        玩法建议：{mode.tip}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/tools/parent-child-play/game/${mode.id}`)}
                      className="shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold text-white bg-duo-green border-b-4 border-duo-green-dark active:scale-95 transition-transform"
                    >
                      进入详情
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          陪伴工具
        </p>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className="text-sm font-extrabold text-gray-800 dark:text-white">
            安抚白噪音
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            低刺激背景音，帮助稳定情绪与入睡过渡。
          </p>
          <div className="flex gap-2 mt-4 mb-3">
            {NOISE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setNoisePreset(preset.id)}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${
                  noisePreset === preset.id
                    ? 'bg-duo-blue text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-4">
            {TIMER_OPTIONS.map((option) => (
              <button
                key={option.label}
                disabled={noiseRunning}
                onClick={() => setNoiseTimerSeconds(option.seconds)}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                  noiseTimerSeconds === option.seconds
                    ? 'bg-duo-purple text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {noiseRunning ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-duo-blue">
                剩余 {formatRemaining(remainingSeconds)}
              </p>
              <button
                onClick={stopNoise}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-duo-red border-b-4 border-red-700 active:scale-95 transition-transform"
              >
                停止
              </button>
            </div>
          ) : (
            <button
              onClick={() => void startNoise()}
              className="w-full rounded-xl px-4 py-3 text-sm font-extrabold text-white bg-duo-blue border-b-4 border-blue-600 active:scale-95 transition-transform"
            >
              开始白噪音
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className="text-sm font-extrabold text-gray-800 dark:text-white">
            宝宝视觉卡片
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            高对比视觉刺激，适合短时追视与注视训练。
          </p>
          <div key={cardIndex} className={`mt-4 ${lowStimulus ? '' : 'animate-slide-up'}`}>
            {visualPreview}
          </div>
          <p className="text-sm font-extrabold text-gray-800 dark:text-white mt-3">
            {currentCard.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {currentCard.subtitle}
          </p>
          <p className="text-xs text-duo-blue font-bold mt-2">
            互动建议：{currentCard.tip}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              onClick={() =>
                setCardIndex((previous) =>
                  previous === 0 ? VISUAL_CARDS.length - 1 : previous - 1,
                )
              }
              className="rounded-xl py-2 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              上一张
            </button>
            <button
              onClick={() =>
                setCardsAutoPlay((previous) => {
                  const next = !previous
                  sileo.info({ title: next ? '已开启自动轮播' : '已暂停自动轮播' })
                  return next
                })
              }
              className={`rounded-xl py-2 text-xs font-bold ${
                cardsAutoPlay
                  ? 'bg-duo-purple text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
              }`}
            >
              {cardsAutoPlay ? '自动中' : '自动轮播'}
            </button>
            <button
              onClick={() => setCardIndex((previous) => (previous + 1) % VISUAL_CARDS.length)}
              className="rounded-xl py-2 text-xs font-bold bg-duo-green text-white"
            >
              下一张
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBadge(props: {
  label: string
  value?: number
  valueText?: string
  tone: string
}) {
  const displayValue =
    props.valueText !== undefined ? props.valueText : String(props.value ?? 0)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800 px-2 py-2 text-center">
      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {props.label}
      </p>
      <p className={`text-sm font-extrabold mt-0.5 ${props.tone}`}>{displayValue}</p>
    </div>
  )
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < channel.length; i++) {
    channel[i] = Math.random() * 2 - 1
  }
  return buffer
}
