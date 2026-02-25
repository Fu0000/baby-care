import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sileo } from 'sileo'
import StickyHeader from '../../../components/StickyHeader.tsx'
import { triggerHaptic } from '../../../lib/haptics.ts'
import { getSettings } from '../../../lib/settings.ts'
import { useCurrentUserId } from '../../../lib/data-scope.ts'
import {
  getParentChildDailyStats,
  getParentChildRecommendation,
  getParentChildRecentStats,
  recordParentChildSession,
} from '../../../lib/parent-child-play.ts'

type NoisePresetId = 'soft' | 'medium' | 'focus'
type GameMode = 'chase' | 'rhythm'
type MusicProfileId = 'lullaby' | 'playful' | 'focus'

interface MusicProfile {
  id: MusicProfileId
  label: string
  subtitle: string
  bpm: number
  wave: OscillatorType
  scale: number[]
  tickFreq: number
  hitGain: number
}

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

const GAME_DURATION_OPTIONS: { label: string; seconds: number }[] = [
  { label: '20秒', seconds: 20 },
  { label: '30秒', seconds: 30 },
  { label: '45秒', seconds: 45 },
]

const MUSIC_PROFILES: MusicProfile[] = [
  {
    id: 'lullaby',
    label: '摇篮',
    subtitle: '慢节奏、低刺激',
    bpm: 82,
    wave: 'sine',
    scale: [262, 330, 392, 523],
    tickFreq: 196,
    hitGain: 0.1,
  },
  {
    id: 'playful',
    label: '活力',
    subtitle: '互动感更强',
    bpm: 104,
    wave: 'triangle',
    scale: [294, 370, 440, 554],
    tickFreq: 220,
    hitGain: 0.13,
  },
  {
    id: 'focus',
    label: '专注',
    subtitle: '节拍更清晰',
    bpm: 96,
    wave: 'square',
    scale: [247, 330, 415, 494],
    tickFreq: 208,
    hitGain: 0.12,
  },
]

const PLAY_MODES: { id: GameMode; label: string; subtitle: string }[] = [
  { id: 'chase', label: '追光模式', subtitle: '找准目标，提升专注与反应' },
  { id: 'rhythm', label: '节奏模式', subtitle: '跟拍互动，训练节奏同步' },
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

const RHYTHM_PERFECT_WINDOW_MS = 140
const RHYTHM_GOOD_WINDOW_MS = 280

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

function getMusicProfile(id: MusicProfileId): MusicProfile {
  return MUSIC_PROFILES.find((profile) => profile.id === id) ?? MUSIC_PROFILES[0]
}

function getNextTarget(previous: number): number {
  const next = Math.floor(Math.random() * 9)
  return next === previous ? (next + 1) % 9 : next
}

function getChaseTickMs(level: number, bpm: number, lowStimulus: boolean): number {
  const beatMs = Math.round(60000 / bpm)
  const speedUp = (level - 1) * 65
  const floor = lowStimulus ? 560 : 420
  return Math.max(floor, beatMs - speedUp)
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

  const [noisePreset, setNoisePreset] = useState<NoisePresetId>('medium')
  const [noiseTimerSeconds, setNoiseTimerSeconds] = useState(600)
  const [noiseRunning, setNoiseRunning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const [cardIndex, setCardIndex] = useState(0)
  const [cardsAutoPlay, setCardsAutoPlay] = useState(!lowStimulus)

  const [gameMode, setGameMode] = useState<GameMode>(recommendation.gameMode)
  const [musicProfileId, setMusicProfileId] = useState<MusicProfileId>(
    recommendation.musicProfile,
  )
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [gameDuration, setGameDuration] = useState(recommendation.durationSeconds)
  const [gameRunning, setGameRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(recommendation.durationSeconds)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [level, setLevel] = useState(1)
  const [bestScores, setBestScores] = useState<Record<GameMode, number>>({
    chase: 0,
    rhythm: 0,
  })
  const [targetIndex, setTargetIndex] = useState(0)
  const [beatIndex, setBeatIndex] = useState(0)
  const [rhythmFeedback, setRhythmFeedback] = useState('准备开始')
  const [dailyStats, setDailyStats] = useState(() => getParentChildDailyStats(userId))
  const [recentStats, setRecentStats] = useState(() => getParentChildRecentStats(userId, 7))

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const gameRunningRef = useRef(false)
  const gameModeRef = useRef<GameMode>('chase')
  const musicProfileRef = useRef<MusicProfileId>(musicProfileId)
  const userIdRef = useRef<string | null>(userId)
  const gameStartedAtRef = useRef<number | null>(null)
  const gamePlannedSecondsRef = useRef(gameDuration)
  const timeLeftRef = useRef(timeLeft)

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const noiseGainRef = useRef<GainNode | null>(null)
  const fxGainRef = useRef<GainNode | null>(null)
  const stopTimeoutRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)

  const melodyStepRef = useRef(0)
  const beatAtRef = useRef(0)
  const beatIdRef = useRef(0)
  const judgedBeatIdRef = useRef(-1)

  const activeMusic = useMemo(() => getMusicProfile(musicProfileId), [musicProfileId])
  const currentCard = VISUAL_CARDS[cardIndex]
  const todayDurationTargetSeconds = recommendation.dailyTargetMinutes * 60
  const todayDurationProgress = Math.min(
    100,
    Math.round((dailyStats.totalDurationSeconds / Math.max(todayDurationTargetSeconds, 1)) * 100),
  )
  const todaySessionProgress = Math.min(
    100,
    Math.round((dailyStats.totalSessions / Math.max(recommendation.dailyTargetSessions, 1)) * 100),
  )
  const recentAverageSeconds = Math.round(
    recentStats.totalDurationSeconds / Math.max(recentStats.days, 1),
  )
  const refreshInteractionStats = useCallback(() => {
    const scope = userIdRef.current
    setDailyStats(getParentChildDailyStats(scope))
    setRecentStats(getParentChildRecentStats(scope, 7))
  }, [])

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    comboRef.current = combo
  }, [combo])

  useEffect(() => {
    maxComboRef.current = maxCombo
  }, [maxCombo])

  useEffect(() => {
    gameRunningRef.current = gameRunning
  }, [gameRunning])

  useEffect(() => {
    gameModeRef.current = gameMode
  }, [gameMode])

  useEffect(() => {
    musicProfileRef.current = musicProfileId
  }, [musicProfileId])

  useEffect(() => {
    userIdRef.current = userId
    refreshInteractionStats()
  }, [refreshInteractionStats, userId])

  useEffect(() => {
    timeLeftRef.current = timeLeft
  }, [timeLeft])

  useEffect(() => {
    gamePlannedSecondsRef.current = gameDuration
  }, [gameDuration])

  useEffect(() => {
    if (gameRunning) return
    setGameMode(recommendation.gameMode)
    setMusicProfileId(recommendation.musicProfile)
    setGameDuration(recommendation.durationSeconds)
    setTimeLeft(recommendation.durationSeconds)
  }, [gameRunning, recommendation])

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
      if (audioContextRef.current) {
        void audioContextRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (!gameRunning) return
    if (gameMode === 'rhythm') {
      setLevel(1)
      setTargetIndex(0)
    } else {
      setBeatIndex(0)
      setRhythmFeedback('准备开始')
    }
  }, [gameMode, gameRunning])

  function stopNoise(): void {
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
  }

  async function ensureAudioReady(): Promise<AudioContext | null> {
    if (typeof window === 'undefined' || !window.AudioContext) {
      return null
    }

    const context = audioContextRef.current ?? new AudioContext()
    if (!audioContextRef.current) {
      audioContextRef.current = context
    }

    if (context.state === 'suspended') {
      await context.resume()
    }

    if (!fxGainRef.current) {
      const gain = context.createGain()
      gain.gain.value = lowStimulus ? 0.17 : 0.22
      gain.connect(context.destination)
      fxGainRef.current = gain
    }

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

  async function startGame(): Promise<void> {
    await ensureAudioReady()

    if (noiseRunning) {
      stopNoise()
      sileo.info({ title: '已暂停白噪音', description: '互动音效模式已开启' })
    }

    melodyStepRef.current = 0
    beatIdRef.current = 0
    judgedBeatIdRef.current = -1
    gameStartedAtRef.current = Date.now()
    gamePlannedSecondsRef.current = gameDuration
    timeLeftRef.current = gameDuration
    gameRunningRef.current = true

    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setLevel(1)
    setTimeLeft(gameDuration)
    setBeatIndex(0)
    setRhythmFeedback('准备开始')
    setTargetIndex(Math.floor(Math.random() * 9))
    setGameRunning(true)

    triggerHaptic('light')
    playEventTone('combo')
  }

  const finishGame = useCallback((reason: 'timeup' | 'manual'): void => {
    if (!gameRunningRef.current) return
    gameRunningRef.current = false

    const finalScore = scoreRef.current
    const mode = gameModeRef.current
    const peakCombo = Math.max(comboRef.current, maxComboRef.current)
    const plannedSeconds = Math.max(1, gamePlannedSecondsRef.current)
    const elapsedSeconds =
      reason === 'timeup'
        ? plannedSeconds
        : Math.max(1, plannedSeconds - timeLeftRef.current)
    const completed =
      reason === 'timeup' || elapsedSeconds >= Math.round(plannedSeconds * 0.8)
    const startedAt = gameStartedAtRef.current ?? Date.now() - elapsedSeconds * 1000

    setGameRunning(false)
    setBestScores((previous) => ({
      ...previous,
      [mode]: Math.max(previous[mode], finalScore),
    }))
    gameStartedAtRef.current = null

    recordParentChildSession(
      {
        startedAt,
        endedAt: Date.now(),
        plannedSeconds,
        actualSeconds: elapsedSeconds,
        completed,
        mode,
        musicProfile: musicProfileRef.current,
        score: finalScore,
        maxCombo: peakCombo,
      },
      userIdRef.current,
    )
    refreshInteractionStats()

    if (reason === 'timeup') {
      sileo.success({
        title: '互动结束',
        description:
          mode === 'chase'
            ? `追光命中 ${finalScore} 次，最高连击 ${peakCombo}`
            : `节奏得分 ${finalScore}，最高连击 ${peakCombo}`,
      })
    }
  }, [refreshInteractionStats])

  const playTone = useCallback((frequency: number, durationMs: number, gainValue: number, wave: OscillatorType): void => {
    if (!musicEnabled) return

    const context = audioContextRef.current
    const output = fxGainRef.current
    if (!context || !output) return

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const endAt = context.currentTime + durationMs / 1000

    oscillator.type = wave
    oscillator.frequency.setValueAtTime(frequency, context.currentTime)

    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(Math.max(gainValue, 0.0002), context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt)

    oscillator.connect(gain)
    gain.connect(output)

    oscillator.start()
    oscillator.stop(endAt + 0.02)

    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  }, [musicEnabled])

  const playEventTone = useCallback((type: 'tick' | 'hit' | 'perfect' | 'good' | 'combo' | 'miss'): void => {
    if (!musicEnabled) return

    const profile = activeMusic
    const note = profile.scale[melodyStepRef.current % profile.scale.length]
    melodyStepRef.current += 1

    if (type === 'tick') {
      playTone(profile.tickFreq, 90, 0.045, profile.wave)
      return
    }

    if (type === 'hit') {
      playTone(note, 140, profile.hitGain, profile.wave)
      return
    }

    if (type === 'perfect') {
      playTone(note * 1.06, 150, profile.hitGain + 0.02, profile.wave)
      return
    }

    if (type === 'good') {
      playTone(note, 120, profile.hitGain * 0.9, profile.wave)
      return
    }

    if (type === 'miss') {
      playTone(profile.tickFreq * 0.7, 130, 0.05, 'sine')
      return
    }

    const chord = [profile.scale[0], profile.scale[1], profile.scale[2]]
    for (let i = 0; i < chord.length; i++) {
      window.setTimeout(() => {
        playTone(chord[i], 110, 0.08, profile.wave)
      }, i * 80)
    }
  }, [activeMusic, musicEnabled, playTone])

  useEffect(() => {
    if (!gameRunning) return

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          finishGame('timeup')
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [finishGame, gameRunning])

  useEffect(() => {
    if (!gameRunning || gameMode !== 'chase') return

    const targetTicker = window.setInterval(() => {
      setTargetIndex((previous) => getNextTarget(previous))
      playEventTone('tick')
    }, getChaseTickMs(level, activeMusic.bpm, lowStimulus))

    return () => window.clearInterval(targetTicker)
  }, [activeMusic.bpm, gameMode, gameRunning, level, lowStimulus, playEventTone])

  useEffect(() => {
    if (!gameRunning || gameMode !== 'rhythm') return

    beatAtRef.current = performance.now()
    beatIdRef.current = 0
    judgedBeatIdRef.current = -1
    setBeatIndex(0)
    setRhythmFeedback('跟着节拍点击下方按钮')

    const beatMs = Math.round(60000 / activeMusic.bpm)

    const rhythmTicker = window.setInterval(() => {
      const currentBeat = beatIdRef.current
      if (currentBeat > 0 && judgedBeatIdRef.current < currentBeat - 1) {
        setCombo(0)
        setRhythmFeedback('漏拍啦，继续就好')
      }

      beatIdRef.current = currentBeat + 1
      beatAtRef.current = performance.now()
      setBeatIndex(beatIdRef.current % 8)
      playEventTone('tick')
    }, beatMs)

    return () => window.clearInterval(rhythmTicker)
  }, [activeMusic.bpm, gameMode, gameRunning, playEventTone])

  function handleChaseTap(index: number): void {
    if (!gameRunning || gameMode !== 'chase') return

    if (index !== targetIndex) {
      setCombo(0)
      playEventTone('miss')
      return
    }

    triggerHaptic('light')
    playEventTone('hit')

    const point = 1 + Math.floor((level - 1) / 2)
    setScore((previous) => previous + point)
    setTargetIndex((previous) => getNextTarget(previous))

    setCombo((previous) => {
      const next = previous + 1
      setMaxCombo((best) => Math.max(best, next))
      if (next > 0 && next % 5 === 0) {
        setLevel((current) => Math.min(current + 1, 5))
        triggerHaptic('medium')
        playEventTone('combo')
      }
      return next
    })
  }

  function handleRhythmTap(): void {
    if (!gameRunning || gameMode !== 'rhythm') return

    const beatId = beatIdRef.current
    if (beatId === judgedBeatIdRef.current) {
      setRhythmFeedback('这一拍已经完成')
      return
    }

    judgedBeatIdRef.current = beatId
    const delta = Math.abs(performance.now() - beatAtRef.current)

    if (delta <= RHYTHM_PERFECT_WINDOW_MS) {
      triggerHaptic('medium')
      playEventTone('perfect')
      setScore((previous) => previous + 2)
      setRhythmFeedback('完美节拍 +2')
      setCombo((previous) => {
        const next = previous + 1
        setMaxCombo((best) => Math.max(best, next))
        return next
      })
      return
    }

    if (delta <= RHYTHM_GOOD_WINDOW_MS) {
      triggerHaptic('light')
      playEventTone('good')
      setScore((previous) => previous + 1)
      setRhythmFeedback('命中 +1')
      setCombo((previous) => {
        const next = previous + 1
        setMaxCombo((best) => Math.max(best, next))
        return next
      })
      return
    }

    setCombo(0)
    setRhythmFeedback('稍微偏拍，继续')
    playEventTone('miss')
  }

  const gameProgress = useMemo(() => {
    if (!gameRunning || gameDuration <= 0) return 0
    return Math.min(100, Math.max(0, ((gameDuration - timeLeft) / gameDuration) * 100))
  }, [gameDuration, gameRunning, timeLeft])

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
        <div className="relative h-44 w-full rounded-2xl bg-white dark:bg-gray-100 flex items-center justify-center border border-gray-300">
          <div className={`absolute h-32 w-32 rounded-full border border-black/20 ${lowStimulus ? '' : 'animate-pulse-ring'}`} />
          <div className="h-28 w-28 rounded-full border-8 border-black flex items-center justify-center">
            <div className="h-5 w-5 rounded-full bg-black" />
          </div>
        </div>
      )
    }

    return (
      <div className="h-44 w-full rounded-2xl bg-white dark:bg-gray-100 flex items-center justify-center border border-gray-300">
        <div className="grid grid-cols-2 gap-4 text-4xl">
          <span className={lowStimulus ? '' : 'animate-float'}>🙂</span>
          <span className={lowStimulus ? '' : 'animate-wiggle'}>😄</span>
          <span className={lowStimulus ? '' : 'animate-bounce-in'}>😮</span>
          <span className={lowStimulus ? '' : 'animate-float'}>😊</span>
        </div>
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

      <div className="px-4 space-y-6">
        <div className="rounded-2xl border border-duo-blue/30 bg-duo-blue/10 px-4 py-3">
          <p className="text-xs font-bold text-duo-blue">
            建议每次互动 5-10 分钟，优先低刺激、可随时停止。
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            按月龄推荐节奏
          </p>
          <div className="rounded-2xl border border-duo-green/25 bg-duo-green/10 px-4 py-3">
            <p className="text-sm font-extrabold text-duo-green">{recommendation.title}</p>
            <p className="text-xs font-bold text-duo-green/90 mt-1">
              {recommendation.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
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
              label="推荐音乐"
              valueText={
                recommendation.musicProfile === 'playful'
                  ? '活力'
                  : recommendation.musicProfile === 'focus'
                    ? '专注'
                    : '摇篮'
              }
              tone="text-duo-purple"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            今日目标：{recommendation.dailyTargetSessions} 场互动，
            累计 {recommendation.dailyTargetMinutes} 分钟
          </p>
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
            近 {recentStats.days} 天：累计 {recentStats.totalSessions} 场，完成率 {recentStats.completionRate}% ，
            日均互动 {formatSecondsAsZh(recentAverageSeconds)}
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
          <div key={cardIndex} className={lowStimulus ? '' : 'animate-slide-up'}>
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
              onClick={() => setCardIndex((previous) => (previous === 0 ? VISUAL_CARDS.length - 1 : previous - 1))}
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

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            互动小游戏（升级版）
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {PLAY_MODES.map((mode) => (
              <button
                key={mode.id}
                disabled={gameRunning}
                onClick={() => setGameMode(mode.id)}
                className={`rounded-xl px-3 py-2 text-left text-xs font-bold border transition-colors disabled:opacity-50 ${
                  gameMode === mode.id
                    ? 'bg-duo-orange/15 border-duo-orange text-duo-orange'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 text-gray-500 dark:text-gray-400'
                }`}
              >
                <p>{mode.label}</p>
                <p className="mt-0.5 text-[10px] font-medium opacity-80">{mode.subtitle}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {MUSIC_PROFILES.map((profile) => (
              <button
                key={profile.id}
                disabled={gameRunning}
                onClick={() => setMusicProfileId(profile.id)}
                className={`rounded-xl py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                  musicProfileId === profile.id
                    ? 'bg-duo-blue text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {profile.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              音乐节奏：{activeMusic.subtitle} · {activeMusic.bpm} BPM
            </p>
            <button
              onClick={() => setMusicEnabled((previous) => !previous)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                musicEnabled
                  ? 'bg-duo-green text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              {musicEnabled ? '音效开' : '音效关'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {GAME_DURATION_OPTIONS.map((option) => (
              <button
                key={option.seconds}
                disabled={gameRunning}
                onClick={() => setGameDuration(option.seconds)}
                className={`rounded-xl py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                  gameDuration === option.seconds
                    ? 'bg-duo-purple text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-gray-100 dark:bg-gray-800 h-2 overflow-hidden mb-3">
            <div
              className="h-full bg-duo-green transition-all duration-300"
              style={{ width: `${gameProgress}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <StatBadge label="得分" value={score} tone="text-duo-orange" />
            <StatBadge label="连击" value={combo} tone="text-duo-green" />
            <StatBadge label="最高" value={maxCombo} tone="text-duo-blue" />
            <StatBadge
              label={gameMode === 'chase' ? '等级' : '最佳'}
              value={gameMode === 'chase' ? level : bestScores[gameMode]}
              tone="text-duo-purple"
            />
          </div>

          {gameMode === 'chase' ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, index) => {
                const active = gameRunning && index === targetIndex
                return (
                  <button
                    key={index}
                    onClick={() => handleChaseTap(index)}
                    className={`relative h-16 rounded-2xl border transition-all ${
                      active
                        ? `bg-duo-yellow border-yellow-500 ${lowStimulus ? '' : 'animate-pulse'}`
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700/60'
                    }`}
                  >
                    {active && !lowStimulus && (
                      <span className="absolute inset-1 rounded-2xl border border-yellow-300/80 animate-pulse-ring" />
                    )}
                    <span className="relative text-lg font-bold">
                      {active ? '⭐' : '·'}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-[#0f1629] p-4">
              <div className="flex items-center gap-2 mb-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 flex-1 rounded-full transition-all ${
                      beatIndex === index
                        ? 'bg-duo-green'
                        : 'bg-gray-200 dark:bg-gray-700/60'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleRhythmTap}
                disabled={!gameRunning}
                className={`w-full rounded-2xl py-4 text-sm font-extrabold transition-transform ${
                  gameRunning
                    ? 'bg-duo-green text-white border-b-4 border-duo-green-dark active:scale-95'
                    : 'bg-gray-200 dark:bg-gray-700/60 text-gray-400'
                }`}
              >
                跟着节拍拍一拍
              </button>
              <p className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 mt-3">
                {gameRunning ? rhythmFeedback : '开始后跟随节拍按钮进行互动'}
              </p>
            </div>
          )}

          {!gameRunning ? (
            <button
              onClick={() => void startGame()}
              className="w-full mt-4 rounded-xl py-3 text-sm font-extrabold text-white bg-duo-orange border-b-4 border-amber-600 active:scale-95 transition-transform"
            >
              开始 {gameDuration} 秒互动
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-xl py-3 text-center text-sm font-extrabold text-duo-orange bg-duo-orange/10">
                进行中 {timeLeft}s
              </div>
              <button
                onClick={() => {
                  finishGame('manual')
                  sileo.info({ title: '已手动结束本次互动' })
                }}
                className="rounded-xl py-3 text-sm font-extrabold text-duo-red bg-duo-red/10 active:scale-95 transition-transform"
              >
                结束
              </button>
            </div>
          )}
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
      <p className={`text-sm font-extrabold mt-0.5 ${props.tone}`}>
        {displayValue}
      </p>
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
