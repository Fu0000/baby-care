import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { sileo } from 'sileo'
import StickyHeader from '../../../components/StickyHeader.tsx'
import { useCurrentUserId } from '../../../lib/data-scope.ts'
import { triggerHaptic } from '../../../lib/haptics.ts'
import { getSettings } from '../../../lib/settings.ts'
import {
  getParentChildRecommendation,
  getParentChildSessions,
  recordParentChildSession,
  type ParentChildGameMode,
  type ParentChildMusicProfileId,
} from '../../../lib/parent-child-play.ts'

type GameMode = ParentChildGameMode
type MusicProfileId = ParentChildMusicProfileId
type FinishGameFn = (reason: 'timeup' | 'manual', options?: { silent?: boolean }) => void

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

const MODE_META: Record<
  GameMode,
  { label: string; subtitle: string; longTip: string; tone: string }
> = {
  chase: {
    label: '追光模式',
    subtitle: '找准目标，提升专注与反应',
    longTip: '让宝宝跟随“⭐”移动；如果宝宝表现出疲劳，随时暂停。',
    tone: 'text-duo-orange',
  },
  rhythm: {
    label: '节奏模式',
    subtitle: '跟拍互动，训练节奏同步',
    longTip: '跟随节拍点击按钮；如果宝宝情绪不佳，降低音量或关掉音效。',
    tone: 'text-duo-green',
  },
}

const RHYTHM_PERFECT_WINDOW_MS = 140
const RHYTHM_GOOD_WINDOW_MS = 280

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

function normalizeMode(raw: string | undefined): GameMode | null {
  if (raw === 'chase' || raw === 'rhythm') return raw
  return null
}

function computeBestScore(userId: string | null, mode: GameMode): number {
  const list = getParentChildSessions(userId)
  let best = 0
  for (const item of list) {
    if (item.mode === mode) best = Math.max(best, item.score)
  }
  return best
}

export default function ParentChildPlayGame() {
  const navigate = useNavigate()
  const params = useParams()
  const routeMode = normalizeMode(params.mode)
  const userId = useCurrentUserId()

  const [settingsSnapshot] = useState(() => getSettings())
  const lowStimulus = settingsSnapshot.comfortMode || settingsSnapshot.motionLevel === 'low'
  const recommendation = useMemo(
    () => getParentChildRecommendation(settingsSnapshot.userStage, lowStimulus),
    [lowStimulus, settingsSnapshot.userStage],
  )

  useEffect(() => {
    if (!routeMode) navigate('/tools/parent-child-play', { replace: true })
  }, [navigate, routeMode])

  const gameMode: GameMode = routeMode ?? recommendation.gameMode
  const meta = MODE_META[gameMode]

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
  const [targetIndex, setTargetIndex] = useState(0)
  const [beatIndex, setBeatIndex] = useState(0)
  const [rhythmFeedback, setRhythmFeedback] = useState('准备开始')
  const [bestScore, setBestScore] = useState(() => computeBestScore(userId, gameMode))

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const gameRunningRef = useRef(false)
  const musicProfileRef = useRef<MusicProfileId>(musicProfileId)
  const userIdRef = useRef<string | null>(userId)
  const gameStartedAtRef = useRef<number | null>(null)
  const gamePlannedSecondsRef = useRef(gameDuration)
  const timeLeftRef = useRef(timeLeft)

  const audioContextRef = useRef<AudioContext | null>(null)
  const fxGainRef = useRef<GainNode | null>(null)

  const melodyStepRef = useRef(0)
  const beatAtRef = useRef(0)
  const beatIdRef = useRef(0)
  const judgedBeatIdRef = useRef(-1)
  const finishGameRef = useRef<FinishGameFn>(() => {})

  const activeMusic = useMemo(() => getMusicProfile(musicProfileId), [musicProfileId])

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
    musicProfileRef.current = musicProfileId
  }, [musicProfileId])

  useEffect(() => {
    userIdRef.current = userId
    setBestScore(computeBestScore(userId, gameMode))
  }, [gameMode, userId])

  useEffect(() => {
    timeLeftRef.current = timeLeft
  }, [timeLeft])

  useEffect(() => {
    gamePlannedSecondsRef.current = gameDuration
  }, [gameDuration])

  useEffect(() => {
    if (gameRunning) return
    setMusicProfileId(recommendation.musicProfile)
    setGameDuration(recommendation.durationSeconds)
    setTimeLeft(recommendation.durationSeconds)
  }, [gameRunning, recommendation])

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

  useEffect(() => {
    return () => {
      if (gameRunningRef.current) {
        // Avoid toast on unmount; still record the session.
        finishGameRef.current('manual', { silent: true })
      }
      if (audioContextRef.current) void audioContextRef.current.close()
    }
  }, [])

  async function ensureAudioReady(): Promise<AudioContext | null> {
    if (typeof window === 'undefined' || !window.AudioContext) return null

    const context = audioContextRef.current ?? new AudioContext()
    if (!audioContextRef.current) audioContextRef.current = context
    if (context.state === 'suspended') await context.resume()

    if (!fxGainRef.current) {
      const gain = context.createGain()
      gain.gain.value = lowStimulus ? 0.17 : 0.22
      gain.connect(context.destination)
      fxGainRef.current = gain
    }

    return context
  }

  const playTone = useCallback(
    (frequency: number, durationMs: number, gainValue: number, wave: OscillatorType): void => {
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
      gain.gain.exponentialRampToValueAtTime(
        Math.max(gainValue, 0.0002),
        context.currentTime + 0.02,
      )
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt)

      oscillator.connect(gain)
      gain.connect(output)

      oscillator.start()
      oscillator.stop(endAt + 0.02)

      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
    },
    [musicEnabled],
  )

  const playEventTone = useCallback(
    (type: 'tick' | 'hit' | 'perfect' | 'good' | 'combo' | 'miss'): void => {
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
        window.setTimeout(() => playTone(chord[i], 110, 0.08, profile.wave), i * 80)
      }
    },
    [activeMusic, musicEnabled, playTone],
  )

  async function startGame(): Promise<void> {
    const context = await ensureAudioReady()
    if (!context && musicEnabled) {
      sileo.info({ title: '当前设备不支持音效，将以静音模式运行' })
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

  const finishGame = useCallback(
    (reason: 'timeup' | 'manual', options?: { silent?: boolean }): void => {
      if (!gameRunningRef.current) return
      gameRunningRef.current = false

      const finalScore = scoreRef.current
      const peakCombo = Math.max(comboRef.current, maxComboRef.current)
      const plannedSeconds = Math.max(1, gamePlannedSecondsRef.current)
      const elapsedSeconds =
        reason === 'timeup'
          ? plannedSeconds
          : Math.max(1, plannedSeconds - timeLeftRef.current)
      const completed = reason === 'timeup' || elapsedSeconds >= Math.round(plannedSeconds * 0.8)
      const startedAt = gameStartedAtRef.current ?? Date.now() - elapsedSeconds * 1000

      setGameRunning(false)
      gameStartedAtRef.current = null

      recordParentChildSession(
        {
          startedAt,
          endedAt: Date.now(),
          plannedSeconds,
          actualSeconds: elapsedSeconds,
          completed,
          mode: gameMode,
          musicProfile: musicProfileRef.current,
          score: finalScore,
          maxCombo: peakCombo,
        },
        userIdRef.current,
      )
      setBestScore((previous) => Math.max(previous, finalScore))

      if (options?.silent) return
      if (reason === 'timeup') {
        sileo.success({
          title: '互动结束',
          description:
            gameMode === 'chase'
              ? `追光命中 ${finalScore} 次，最高连击 ${peakCombo}`
              : `节奏得分 ${finalScore}，最高连击 ${peakCombo}`,
        })
      } else {
        sileo.info({ title: '已结束本次互动' })
      }
    },
    [gameMode],
  )

  useEffect(() => {
    finishGameRef.current = finishGame
  }, [finishGame])

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

  return (
    <div className="max-w-lg mx-auto pb-4">
      <StickyHeader>
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => navigate('/tools/parent-child-play')}
            className="absolute left-0 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 pr-2"
          >
            ← 返回
          </button>
          <h1 className="text-xl font-extrabold text-gray-800 dark:text-white">
            {meta.label}
          </h1>
        </div>
      </StickyHeader>

      <div className="px-4 space-y-6 pb-4">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className={`text-sm font-extrabold ${meta.tone}`}>{meta.subtitle}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            {meta.longTip}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            推荐：{recommendation.title} · {recommendation.durationSeconds}s ·{' '}
            {recommendation.musicProfile === 'playful'
              ? '活力'
              : recommendation.musicProfile === 'focus'
                ? '专注'
                : '摇篮'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-5">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            互动配置
          </p>

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
              value={gameMode === 'chase' ? level : bestScore}
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
                    <span className="relative text-lg font-bold">{active ? '⭐' : '·'}</span>
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
                      beatIndex === index ? 'bg-duo-green' : 'bg-gray-200 dark:bg-gray-700/60'
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
                onClick={() => finishGame('manual')}
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
      <p className={`text-sm font-extrabold mt-0.5 ${props.tone}`}>{displayValue}</p>
    </div>
  )
}
