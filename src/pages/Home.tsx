import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconChildHeadOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconTimer2OutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { db, type KickSession } from '../lib/db.ts'
import { getDaysUntilDue } from '../lib/settings.ts'
import { isSameDay } from '../lib/time.ts'

interface ToolCard {
  id: string
  title: string
  subtitle: string
  icon: ReactNode
  path: string
  available: boolean
}

const tools: ToolCard[] = [
  {
    id: 'kick-counter',
    title: '数胎动',
    subtitle: 'Cardiff Count-to-10',
    icon: <IconChildHeadOutlineDuo18 size={32} />,
    path: '/tools/kick-counter',
    available: true,
  },
  {
    id: 'contraction-timer',
    title: '宫缩计时',
    subtitle: '记录间隔与时长',
    icon: <IconTimer2OutlineDuo18 size={32} />,
    path: '/tools/contraction-timer',
    available: true,
  },
  {
    id: 'hospital-bag',
    title: '待产包',
    subtitle: '准备清单',
    icon: <span className="text-[32px]">🎒</span>,
    path: '/tools/hospital-bag',
    available: false,
  },
  {
    id: 'feeding-log',
    title: '喂奶记录',
    subtitle: '哺乳追踪',
    icon: <span className="text-[32px]">🍼</span>,
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
      {/* Hero Banner — full bleed */}
      <div className="bg-gradient-to-b from-duo-green/15 to-transparent dark:from-duo-green/10 dark:to-transparent pt-8 pb-10">
        <div className="flex flex-col items-center max-w-lg mx-auto px-4">
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

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {/* Overview Stats — single panel with 3 columns */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            概览
          </p>
          <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 flex">
            {/* Streak */}
            <div className="flex-1 py-3.5 px-2 text-center">
              <span className="text-base block mb-0.5">🔥</span>
              <p className="text-lg font-extrabold text-duo-orange leading-none">{streak}</p>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">连续</p>
            </div>
            <div className="w-px bg-gray-100 dark:bg-gray-700/40 my-3" />
            {/* Today Kicks */}
            <div className="flex-1 py-3.5 px-2 text-center">
              <IconChildHeadOutlineDuo18 size={18} className="mx-auto block mb-0.5 text-duo-green" />
              <p className="text-lg font-extrabold text-duo-green leading-none">{todayKicks}</p>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">今日胎动</p>
            </div>
            <div className="w-px bg-gray-100 dark:bg-gray-700/40 my-3" />
            {/* Due Date */}
            <div className="flex-1 py-3.5 px-2 text-center">
              <span className="text-base block mb-0.5">📅</span>
              <p className={`text-lg font-extrabold leading-none ${
                daysUntilDue !== null && daysUntilDue <= 0
                  ? 'text-duo-orange'
                  : 'text-duo-purple'
              }`}>
                {daysUntilDue !== null ? formatDueDate(daysUntilDue) : '—'}
              </p>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">预产期</p>
            </div>
          </div>
        </div>

        {/* Tool Cards Grid */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            工具
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => tool.available && navigate(tool.path)}
                className={`rounded-2xl py-5 px-4 flex flex-col items-center justify-center text-center transition-all duration-150 ${
                  tool.available
                    ? 'bg-white dark:bg-[#16213e] border border-gray-200 dark:border-gray-700/60 active:scale-[0.96]'
                    : 'bg-gray-50 dark:bg-gray-800/30 border border-dashed border-gray-200 dark:border-gray-700 opacity-40'
                }`}
              >
                {!tool.available && (
                  <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full mb-1">
                    即将推出
                  </span>
                )}
                <div className="mb-2 text-gray-600 dark:text-gray-300">{tool.icon}</div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">
                  {tool.title}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {tool.subtitle}
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
