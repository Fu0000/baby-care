import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, type KickSession } from '../lib/db.ts'
import { getDaysUntilDue } from '../lib/settings.ts'
import { isSameDay } from '../lib/time.ts'

interface ToolCard {
  id: string
  title: string
  subtitle: string
  emoji: string
  color: string
  bgColor: string
  shadowColor: string
  path: string
  available: boolean
}

const tools: ToolCard[] = [
  {
    id: 'kick-counter',
    title: '数胎动',
    subtitle: 'Cardiff Count-to-10',
    emoji: '🦶',
    color: '#58CC02',
    bgColor: 'bg-duo-green/10',
    shadowColor: 'shadow-duo-green/20',
    path: '/tools/kick-counter',
    available: true,
  },
  {
    id: 'contraction-timer',
    title: '宫缩计时',
    subtitle: '记录间隔与持续时间',
    emoji: '⏱️',
    color: '#FF9600',
    bgColor: 'bg-duo-orange/10',
    shadowColor: 'shadow-duo-orange/20',
    path: '/tools/contraction-timer',
    available: true,
  },
  {
    id: 'hospital-bag',
    title: '待产包',
    subtitle: '准备清单',
    emoji: '🎒',
    color: '#1CB0F6',
    bgColor: 'bg-duo-blue/10',
    shadowColor: 'shadow-duo-blue/20',
    path: '/tools/hospital-bag',
    available: false,
  },
  {
    id: 'feeding-log',
    title: '喂奶记录',
    subtitle: '哺乳追踪',
    emoji: '🍼',
    color: '#CE82FF',
    bgColor: 'bg-duo-purple/10',
    shadowColor: 'shadow-duo-purple/20',
    path: '/tools/feeding-log',
    available: false,
  },
]

export default function Home() {
  const navigate = useNavigate()
  const [todayKicks, setTodayKicks] = useState(0)
  const [streak, setStreak] = useState(0)
  const daysUntilDue = getDaysUntilDue()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const sessions: KickSession[] = await db.sessions.orderBy('startedAt').reverse().toArray()
    const today = sessions.filter(s => isSameDay(s.startedAt, Date.now()))
    setTodayKicks(today.reduce((sum, s) => sum + s.kickCount, 0))

    let currentStreak = 0
    const now = Date.now()
    const dayMs = 86400000
    for (let i = 0; i < 365; i++) {
      const dayStart = now - i * dayMs
      const hasSession = sessions.some(s => isSameDay(s.startedAt, dayStart))
      if (hasSession) {
        currentStreak++
      } else if (i > 0) {
        break
      }
    }
    setStreak(currentStreak)
  }

  return (
    <div className="px-4 pt-10 pb-4">
      {/* Header with mascot */}
      <div className="text-center mb-6">
        <img
          src="/mascot.png"
          alt="宝宝助手"
          className="w-20 h-20 mx-auto mb-3 animate-float"
        />
        <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white">
          宝宝助手
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          孕期全程陪伴
        </p>
      </div>

      {/* Due date countdown */}
      {daysUntilDue !== null && (
        <div className="bg-white dark:bg-[#16213e] rounded-3xl p-4 mb-5 shadow-sm animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤰</span>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">预产期倒计时</p>
                <p className="text-2xl font-extrabold text-gray-800 dark:text-white">
                  {daysUntilDue > 0 ? (
                    <>{daysUntilDue} <span className="text-base font-normal text-gray-400">天</span></>
                  ) : daysUntilDue === 0 ? (
                    <span className="text-duo-orange">就是今天！</span>
                  ) : (
                    <span className="text-duo-red">已过 {Math.abs(daysUntilDue)} 天</span>
                  )}
                </p>
              </div>
            </div>
            {daysUntilDue > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-400">约</p>
                <p className="text-lg font-bold text-duo-purple">
                  {Math.floor(daysUntilDue / 7)} 周
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="text-duo-orange text-lg">🔥</span>
          <span className="text-sm font-bold text-duo-orange">
            连续 {streak} 天记录胎动！
          </span>
        </div>
      )}

      {/* Quick stat */}
      {todayKicks > 0 && (
        <div className="flex items-center justify-center gap-2 mb-5 bg-duo-green/10 dark:bg-duo-green/5 rounded-2xl py-3">
          <span className="text-sm text-duo-green font-bold">今日胎动: {todayKicks} 次 ✓</span>
        </div>
      )}

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => tool.available && navigate(tool.path)}
            className={`relative rounded-3xl p-5 text-left transition-all duration-150 shadow-sm ${
              tool.available
                ? `${tool.bgColor} active:scale-95 hover:shadow-md`
                : 'bg-gray-100 dark:bg-gray-800/50 opacity-60'
            }`}
          >
            {!tool.available && (
              <div className="absolute top-3 right-3">
                <span className="text-sm text-gray-400">🔒</span>
              </div>
            )}
            <div className="text-3xl mb-3">{tool.emoji}</div>
            <p className="text-sm font-extrabold text-gray-800 dark:text-white">
              {tool.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {tool.available ? tool.subtitle : '即将推出'}
            </p>
          </button>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8 mb-4 px-6">
        本应用仅为记录工具，不提供医学建议。如有异常请咨询医生。
      </p>
    </div>
  )
}
