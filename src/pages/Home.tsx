import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, type KickSession } from '../lib/db.ts'
import { getDaysUntilDue } from '../lib/settings.ts'
import { isSameDay } from '../lib/time.ts'

interface ToolCard {
  id: string
  title: string
  emoji: string
  path: string
  available: boolean
}

const tools: ToolCard[] = [
  {
    id: 'kick-counter',
    title: '数胎动',
    emoji: '🦶',
    path: '/tools/kick-counter',
    available: true,
  },
  {
    id: 'contraction-timer',
    title: '宫缩计时',
    emoji: '⏱️',
    path: '/tools/contraction-timer',
    available: true,
  },
  {
    id: 'hospital-bag',
    title: '待产包',
    emoji: '🎒',
    path: '/tools/hospital-bag',
    available: false,
  },
  {
    id: 'feeding-log',
    title: '喂奶记录',
    emoji: '🍼',
    path: '/tools/feeding-log',
    available: false,
  },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，注意休息哦'
  if (hour < 9) return '早上好！新的一天开始啦'
  if (hour < 12) return '上午好！今天感觉怎么样？'
  if (hour < 14) return '中午好！记得吃饭哦'
  if (hour < 18) return '下午好！宝宝活跃吗？'
  return '晚上好！今天辛苦了'
}

function formatDueDate(days: number): string {
  if (days > 0) return `${days}天`
  if (days === 0) return '今天！'
  return `+${Math.abs(days)}天`
}

export default function Home() {
  const navigate = useNavigate()
  const [todayKicks, setTodayKicks] = useState(0)
  const [streak, setStreak] = useState(0)
  const daysUntilDue = getDaysUntilDue()
  const greeting = getGreeting()

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
    <div className="pb-4">
      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-duo-green/15 to-transparent dark:from-duo-green/10 dark:to-transparent px-4 pt-8 pb-10">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 mb-3 rounded-full overflow-hidden ring-4 ring-duo-green/20 dark:ring-duo-green/15 animate-float">
            <img
              src="/mascot.png"
              alt="宝宝助手"
              className="w-full h-full object-cover scale-135"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white">
            宝宝助手
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {greeting}
          </p>
        </div>
      </div>

      <div className="px-4 -mt-4">
        {/* Overview Stats Row */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            概览
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Streak */}
            <div className="bg-white dark:bg-[#16213e] rounded-2xl pt-0 overflow-hidden border border-gray-200 dark:border-gray-700/60">
              <div className="h-[3px] bg-duo-orange" />
              <div className="px-3 py-3 text-center">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                  连续天数
                </p>
                <p className="text-xl font-extrabold text-gray-800 dark:text-white">
                  <span className="mr-0.5">🔥</span>{streak}
                </p>
              </div>
            </div>

            {/* Today Kicks */}
            <div className="bg-white dark:bg-[#16213e] rounded-2xl pt-0 overflow-hidden border border-gray-200 dark:border-gray-700/60">
              <div className="h-[3px] bg-duo-green" />
              <div className="px-3 py-3 text-center">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                  今日胎动
                </p>
                <p className="text-xl font-extrabold text-gray-800 dark:text-white">
                  <span className="mr-0.5">🦶</span>{todayKicks}
                </p>
              </div>
            </div>

            {/* Due Date */}
            <div className="bg-white dark:bg-[#16213e] rounded-2xl pt-0 overflow-hidden border border-gray-200 dark:border-gray-700/60">
              <div className="h-[3px] bg-duo-purple" />
              <div className="px-3 py-3 text-center">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                  预产倒计时
                </p>
                <p className={`text-xl font-extrabold ${
                  daysUntilDue !== null && daysUntilDue <= 0
                    ? 'text-duo-orange'
                    : 'text-gray-800 dark:text-white'
                }`}>
                  <span className="mr-0.5">📅</span>
                  {daysUntilDue !== null ? formatDueDate(daysUntilDue) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tool Cards Grid */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            工具
          </p>
          <div className="grid grid-cols-2 gap-3">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => tool.available && navigate(tool.path)}
                className={`relative rounded-2xl aspect-square flex flex-col items-center justify-center transition-all duration-150 ${
                  tool.available
                    ? 'bg-white dark:bg-[#16213e] border-2 border-gray-200 dark:border-gray-700/60 active:scale-95'
                    : 'bg-gray-50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 opacity-40'
                }`}
              >
                {!tool.available && (
                  <div className="absolute top-2.5 right-3">
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                      即将推出
                    </span>
                  </div>
                )}
                <span className="text-[40px] mb-2 leading-none">{tool.emoji}</span>
                <p className="text-sm font-bold text-gray-800 dark:text-white">
                  {tool.title}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6 mb-4 px-6">
          本应用仅为记录工具，不提供医学建议。如有异常请咨询医生。
        </p>
      </div>
    </div>
  )
}
