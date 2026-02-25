import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { sileo } from 'sileo'
import { ApiError } from '../../lib/api/client.ts'
import { getAuthSession, getSafeNext, loginWithPassword } from '../../lib/auth.ts'
import { isOnboardingCompleted } from '../../lib/onboarding.ts'
import { migrateLocalDataIfNeeded } from '../../lib/migration.ts'

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = useMemo(() => getSafeNext(params.get('next'), '/history'), [params])
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOnboardingCompleted()) {
      navigate(`/onboarding?next=${encodeURIComponent(next)}`, { replace: true })
      return
    }

    const session = getAuthSession()
    if (!session) return

    if (session.user.inviteBound) {
      navigate(next, { replace: true })
    } else {
      navigate(`/invite/bind?next=${encodeURIComponent(next)}`, { replace: true })
    }
  }, [navigate, next])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSubmitting(true)
    try {
      const session = await loginWithPassword({ phone: phone.trim(), password })
      sileo.success({ title: '登录成功' })
      if (session.user.inviteBound) {
        await migrateLocalDataIfNeeded()
        navigate(next, { replace: true })
      } else {
        navigate(`/invite/bind?next=${encodeURIComponent(next)}`, { replace: true })
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '登录失败，请稍后重试'
      sileo.error({ title: '登录失败', description: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-[#1a1a2e]">
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-700/60 dark:bg-[#16213e]">
          <div className="mb-4">
            <Link
              to="/"
              className="text-xs font-bold text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              ← 返回首页
            </Link>
          </div>
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-500">账号登录</p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-800 dark:text-white">欢迎回来</h1>
          <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">登录后可绑定邀请码并同步历史数据</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-gray-500 dark:text-gray-400">手机号</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入 11 位手机号"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-duo-green dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-gray-500 dark:text-gray-400">密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-duo-green dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl border-b-4 border-duo-green-dark bg-duo-green py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
            没有账号？
            <Link
              to={`/auth/register?next=${encodeURIComponent(next)}`}
              className="ml-1 text-duo-blue"
            >
              去注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
