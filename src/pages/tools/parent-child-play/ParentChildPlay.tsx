import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sileo } from 'sileo'
import StickyHeader from '../../../components/StickyHeader.tsx'
import { triggerHaptic } from '../../../lib/haptics.ts'

type NoisePresetId = 'soft' | 'medium' | 'focus'

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

const VISUAL_CARDS: { title: string; subtitle: string; type: 'rings' | 'stripes' | 'target' | 'faces' }[] = [
  { title: '黑白同心环', subtitle: '适合 0-3 月追视训练', type: 'rings' },
  { title: '高对比条纹', subtitle: '帮助集中视线与跟随', type: 'stripes' },
  { title: '中心注视点', subtitle: '短时注视练习（每次 10-20 秒）', type: 'target' },
  { title: '笑脸识别', subtitle: '轻度情绪互动与注视转移', type: 'faces' },
]

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function getNoiseVolume(id: NoisePresetId): number {
  return NOISE_PRESETS.find((preset) => preset.id === id)?.volume ?? 0.08
}

export default function ParentChildPlay() {
  const navigate = useNavigate()

  const [noisePreset, setNoisePreset] = useState<NoisePresetId>('medium')
  const [noiseTimerSeconds, setNoiseTimerSeconds] = useState(600)
  const [noiseRunning, setNoiseRunning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const [cardIndex, setCardIndex] = useState(0)

  const [gameRunning, setGameRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [targetIndex, setTargetIndex] = useState(0)
  const scoreRef = useRef(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const stopTimeoutRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)

  function stopNoise(): void {
    if (sourceRef.current) {
      sourceRef.current.stop()
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (gainRef.current) {
      gainRef.current.disconnect()
      gainRef.current = null
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
  }

  const currentCard = VISUAL_CARDS[cardIndex]

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    if (!noiseRunning || !gainRef.current) return
    gainRef.current.gain.value = getNoiseVolume(noisePreset)
  }, [noisePreset, noiseRunning])

  useEffect(() => {
    if (!gameRunning) return

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          const finalScore = scoreRef.current
          setGameRunning(false)
          setBestScore((best) => Math.max(best, finalScore))
          sileo.success({
            title: '互动结束',
            description: `宝宝共命中 ${finalScore} 次小星星`,
          })
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [gameRunning])

  useEffect(() => {
    if (!gameRunning) return
    const targetTicker = window.setInterval(() => {
      setTargetIndex((previous) => {
        const next = Math.floor(Math.random() * 9)
        return next === previous ? (next + 1) % 9 : next
      })
    }, 850)

    return () => window.clearInterval(targetTicker)
  }, [gameRunning])

  useEffect(() => {
    return () => {
      stopNoise()
      if (audioContextRef.current) {
        void audioContextRef.current.close()
      }
    }
  }, [])

  async function startNoise(): Promise<void> {
    try {
      if (!window.AudioContext) {
        sileo.error({ title: '当前设备不支持白噪音播放' })
        return
      }

      const context = audioContextRef.current ?? new AudioContext()
      if (!audioContextRef.current) {
        audioContextRef.current = context
      }
      if (context.state === 'suspended') {
        await context.resume()
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
      gainRef.current = gain
      setNoiseRunning(true)
      setRemainingSeconds(noiseTimerSeconds)

      if (noiseTimerSeconds > 0) {
        stopTimeoutRef.current = window.setTimeout(() => {
          stopNoise()
        }, noiseTimerSeconds * 1000)

        countdownRef.current = window.setInterval(() => {
          setRemainingSeconds((previous) => (previous > 0 ? previous - 1 : 0))
        }, 1000)
      }
    } catch {
      sileo.error({ title: '白噪音启动失败，请稍后重试' })
    }
  }

  function startGame(): void {
    setScore(0)
    setTimeLeft(20)
    setTargetIndex(Math.floor(Math.random() * 9))
    setGameRunning(true)
  }

  function hitCell(index: number): void {
    if (!gameRunning || index !== targetIndex) return
    triggerHaptic('light')
    setScore((previous) => previous + 1)
    setTargetIndex((previous) => {
      const next = Math.floor(Math.random() * 9)
      return next === previous ? (next + 2) % 9 : next
    })
  }

  const visualPreview = useMemo(() => {
    if (currentCard.type === 'rings') {
      return (
        <div
          className="h-44 w-full rounded-2xl"
          style={{
            background:
              'radial-gradient(circle at center, #000 0 12%, #fff 12% 24%, #000 24% 36%, #fff 36% 48%, #000 48% 60%, #fff 60% 72%, #000 72% 100%)',
          }}
        />
      )
    }

    if (currentCard.type === 'stripes') {
      return (
        <div
          className="h-44 w-full rounded-2xl"
          style={{
            background:
              'repeating-linear-gradient(90deg, #000 0 18px, #fff 18px 36px)',
          }}
        />
      )
    }

    if (currentCard.type === 'target') {
      return (
        <div className="h-44 w-full rounded-2xl bg-white flex items-center justify-center border border-gray-300">
          <div className="h-28 w-28 rounded-full border-8 border-black flex items-center justify-center">
            <div className="h-5 w-5 rounded-full bg-black" />
          </div>
        </div>
      )
    }

    return (
      <div className="h-44 w-full rounded-2xl bg-white flex items-center justify-center border border-gray-300">
        <div className="grid grid-cols-2 gap-4 text-4xl">
          <span>🙂</span>
          <span>😄</span>
          <span>😮</span>
          <span>😊</span>
        </div>
      </div>
    )
  }, [currentCard.type])

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

      <div className="px-4 space-y-6">
        <div className="rounded-2xl border border-duo-blue/30 bg-duo-blue/10 px-4 py-3">
          <p className="text-xs font-bold text-duo-blue">
            建议每次互动 5-10 分钟，优先低刺激、可随时停止。
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            安抚白噪音
          </p>
          <div className="flex gap-2 mb-3">
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
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            宝宝视觉卡片
          </p>
          {visualPreview}
          <p className="text-sm font-extrabold text-gray-800 dark:text-white mt-3">
            {currentCard.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {currentCard.subtitle}
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setCardIndex((previous) => (previous === 0 ? VISUAL_CARDS.length - 1 : previous - 1))}
              className="flex-1 rounded-xl py-2 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              上一张
            </button>
            <button
              onClick={() => setCardIndex((previous) => (previous + 1) % VISUAL_CARDS.length)}
              className="flex-1 rounded-xl py-2 text-xs font-bold bg-duo-green text-white"
            >
              下一张
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            互动小游戏
          </p>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
              命中 {score} 次
            </p>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              最佳 {bestScore} 次
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, index) => (
              <button
                key={index}
                onClick={() => hitCell(index)}
                className={`h-16 rounded-2xl border transition-all ${
                  gameRunning && index === targetIndex
                    ? 'bg-duo-yellow border-yellow-500 scale-[1.02]'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700/60'
                }`}
              >
                <span className="text-lg">{gameRunning && index === targetIndex ? '⭐' : '·'}</span>
              </button>
            ))}
          </div>
          {!gameRunning ? (
            <button
              onClick={startGame}
              className="w-full mt-4 rounded-xl py-3 text-sm font-extrabold text-white bg-duo-orange border-b-4 border-amber-600 active:scale-95 transition-transform"
            >
              开始 20 秒互动
            </button>
          ) : (
            <div className="w-full mt-4 rounded-xl py-3 text-center text-sm font-extrabold text-duo-orange bg-duo-orange/10">
              进行中 {timeLeft}s
            </div>
          )}
        </div>
      </div>
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
