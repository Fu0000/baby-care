import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sileo } from 'sileo'
import { ApiError } from '../../lib/api/client.ts'
import {
  bindInviteCode,
  getAuthSession,
  getSafeNext,
  logout,
} from '../../lib/auth.ts'
import { migrateLocalDataIfNeeded } from '../../lib/migration.ts'

export default function InviteBind() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = useMemo(() => getSafeNext(params.get('next'), '/history'), [params])
  const session = getAuthSession()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!session) {
      navigate(`/auth/login?next=${encodeURIComponent(next)}`, { replace: true })
      return
    }

    if (session.user.inviteBound) {
      navigate(next, { replace: true })
    }
  }, [navigate, next, session])

  if (!session || session.user.inviteBound) return null

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)

    try {
      await bindInviteCode(code)
      await migrateLocalDataIfNeeded()
      sileo.success({ title: '邀请码绑定成功', description: '历史数据已开始同步' })
      navigate(next, { replace: true })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '绑定失败，请检查邀请码'
      sileo.error({ title: '邀请码无效', description: message })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSwitchAccount() {
    await logout()
    navigate(`/auth/login?next=${encodeURIComponent(next)}`, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-[#1a1a2e]">
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-700/60 dark:bg-[#16213e]">
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-500">邀请码验证</p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-800 dark:text-white">输入邀请码解锁完整功能</h1>
          <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">绑定后会自动迁移你当前设备上的本地记录到云端</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-gray-500 dark:text-gray-400">邀请码</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="例如 BC8K5M2QZ"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base font-extrabold tracking-wider text-gray-800 uppercase outline-none focus:border-duo-orange dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || code.trim().length < 6}
              className="w-full rounded-2xl border-b-4 border-[#b86d00] bg-duo-orange py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? '验证中...' : '验证并继续'}
            </button>
          </form>

          <button
            onClick={handleSwitchAccount}
            className="mt-4 w-full rounded-2xl border border-gray-200 py-2.5 text-xs font-bold text-gray-500 dark:border-gray-700 dark:text-gray-400"
          >
            切换账号
          </button>
        </div>
      </div>
    </div>
  )
}
