import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { markOnboardingCompleted } from '../../lib/onboarding.ts'
import { getSafeNext } from '../../lib/auth.ts'

const slides = [
  {
    title: '欢迎来到宝宝助手',
    subtitle: '一个面向准妈妈和新手爸妈的全流程记录工具',
    accent: 'text-duo-green',
    bg: 'bg-duo-green/10 dark:bg-duo-green/15',
    points: ['胎动、宫缩、待产包、喂养一站式记录', '支持离线使用，网络恢复后自动同步'],
  },
  {
    title: '数据更安全',
    subtitle: '登录后可进行云端备份，支持多设备同步',
    accent: 'text-duo-blue',
    bg: 'bg-duo-blue/10 dark:bg-duo-blue/15',
    points: ['手机号+密码登录，邀请码校验后解锁完整功能', '历史本地数据将自动迁移到云端'],
  },
  {
    title: '权限说明',
    subtitle: '我们只在必要场景请求权限',
    accent: 'text-duo-purple',
    bg: 'bg-duo-purple/10 dark:bg-duo-purple/15',
    points: ['通知权限用于提醒关键时间节点', '所有数据仅用于你的记录服务，不做医疗诊断'],
  },
  {
    title: '开始使用',
    subtitle: '你可以先游客体验，也可以立即登录绑定邀请码',
    accent: 'text-duo-orange',
    bg: 'bg-duo-orange/10 dark:bg-duo-orange/15',
    points: ['游客可浏览首页和基础内容', '关键记录与历史功能将引导登录后使用'],
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [index, setIndex] = useState(0)
  const current = slides[index]

  const nextPath = useMemo(
    () => getSafeNext(params.get('next'), '/'),
    [params],
  )

  function finish(): void {
    markOnboardingCompleted()
    navigate(nextPath, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-8 dark:bg-[#1a1a2e]">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
        <div className="pt-6 text-right">
          <button
            onClick={finish}
            className="rounded-full px-3 py-1 text-xs font-bold text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            跳过
          </button>
        </div>

        <div className="mb-5 mt-4 flex gap-2">
          {slides.map((_slide, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-duo-green' : 'bg-gray-200 dark:bg-gray-700'}`}
            />
          ))}
        </div>

        <div className={`rounded-3xl border border-gray-200 p-6 ${current.bg} dark:border-gray-700/60`}>
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-500">首次引导</p>
          <h1 className={`mt-2 text-3xl font-extrabold ${current.accent}`}>{current.title}</h1>
          <p className="mt-2 text-sm font-bold text-gray-700 dark:text-gray-200">{current.subtitle}</p>
          <ul className="mt-5 space-y-2">
            {current.points.map((point) => (
              <li
                key={point}
                className="rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm font-bold text-gray-700 dark:border-gray-700/60 dark:bg-[#16213e]/80 dark:text-gray-100"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto space-y-3 pt-6">
          {index < slides.length - 1 ? (
            <button
              onClick={() => setIndex((i) => i + 1)}
              className="w-full rounded-2xl border-b-4 border-duo-green-dark bg-duo-green py-4 text-base font-extrabold text-white active:translate-y-[1px]"
            >
              下一步
            </button>
          ) : (
            <>
              <button
                onClick={finish}
                className="w-full rounded-2xl border-b-4 border-duo-green-dark bg-duo-green py-4 text-base font-extrabold text-white active:translate-y-[1px]"
              >
                完成并进入首页
              </button>
              <button
                onClick={() => {
                  markOnboardingCompleted()
                  navigate(`/auth/login?next=${encodeURIComponent(nextPath)}`, {
                    replace: true,
                  })
                }}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 text-sm font-extrabold text-gray-700 dark:border-gray-700 dark:bg-[#16213e] dark:text-gray-200"
              >
                立即登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
