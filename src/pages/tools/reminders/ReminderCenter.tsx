import { useEffect, useState } from 'react'
import { NumberField } from '@base-ui/react/number-field'
import { useNavigate } from 'react-router-dom'
import { sileo } from 'sileo'
import StickyHeader from '../../../components/StickyHeader.tsx'
import { useCurrentUserId } from '../../../lib/data-scope.ts'
import {
  type ReminderConfig,
  getNotificationPermissionStatus,
  getReminderConfig,
  requestNotificationPermission,
  saveReminderConfig,
} from '../../../lib/reminders.ts'

type PermissionState = NotificationPermission | 'unsupported'

function permissionLabel(status: PermissionState): string {
  if (status === 'granted') return '已授权'
  if (status === 'denied') return '已拒绝'
  if (status === 'default') return '未授权'
  return '不支持'
}

function permissionTone(status: PermissionState): string {
  if (status === 'granted') return 'text-duo-green bg-duo-green/10 border-duo-green/30'
  if (status === 'denied') return 'text-duo-red bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
  if (status === 'default') return 'text-duo-orange bg-duo-orange/10 border-duo-orange/30'
  return 'text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
}

export default function ReminderCenter() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const [config, setConfig] = useState<ReminderConfig>(() => getReminderConfig(userId))
  const [permission, setPermission] = useState<PermissionState>(
    getNotificationPermissionStatus(),
  )
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    setConfig(getReminderConfig(userId))
    setPermission(getNotificationPermissionStatus())
  }, [userId])

  function updateConfig(patch: Partial<ReminderConfig>): void {
    const next = { ...config, ...patch }
    setConfig(next)
    saveReminderConfig(next, userId)
  }

  async function handleRequestPermission(): Promise<void> {
    if (permission === 'unsupported') {
      sileo.error({ title: '当前浏览器不支持系统通知' })
      return
    }

    setRequesting(true)
    try {
      const result = await requestNotificationPermission()
      setPermission(result)
      if (result === 'granted') {
        sileo.success({ title: '通知权限已开启' })
      } else if (result === 'denied') {
        sileo.error({ title: '通知权限被拒绝', description: '请在浏览器设置中手动开启' })
      } else {
        sileo.info({ title: '你还没有授予通知权限' })
      }
    } finally {
      setRequesting(false)
    }
  }

  async function handleToggleNotifications(): Promise<void> {
    if (config.notificationsEnabled) {
      updateConfig({ notificationsEnabled: false })
      sileo.info({ title: '提醒已关闭' })
      return
    }

    if (permission !== 'granted') {
      const result = await requestNotificationPermission()
      setPermission(result)
      if (result !== 'granted') {
        sileo.error({ title: '未获得通知权限，无法开启提醒' })
        return
      }
    }

    updateConfig({ notificationsEnabled: true })
    sileo.success({ title: '提醒已开启' })
  }

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
            提醒中心
          </h1>
        </div>
      </StickyHeader>

      <div className="px-4 space-y-6">
        <div className="rounded-3xl border border-duo-blue/30 bg-duo-blue/10 p-5">
          <p className="text-sm font-bold text-duo-blue">按你的节奏设置提醒</p>
          <p className="text-xs text-duo-blue/90 mt-1 leading-relaxed">
            提醒仅在当前设备生效。夜间默认静默，避免过度打扰；你可随时调整频率。
          </p>
        </div>

        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          通知权限
        </p>
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">系统通知权限</p>
              <p className="text-xs text-gray-400 mt-0.5">
                需要授权后，应用才能发送喂奶和胎动提醒。
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${permissionTone(permission)}`}
            >
              {permissionLabel(permission)}
            </span>
          </div>
          <button
            onClick={() => void handleRequestPermission()}
            disabled={requesting || permission === 'unsupported'}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {requesting ? '请求中…' : '请求通知权限'}
          </button>
        </div>

        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          提醒总开关
        </p>
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">启用智能提醒</p>
              <p className="text-xs text-gray-400 mt-0.5">
                关闭后将暂停全部提醒规则，不影响历史记录。
              </p>
            </div>
            <button
              onClick={() => void handleToggleNotifications()}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                config.notificationsEnabled
                  ? 'bg-duo-green text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              {config.notificationsEnabled ? '已开启' : '已关闭'}
            </button>
          </div>
        </div>

        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          规则配置
        </p>
        <div className="space-y-3 pb-4">
          <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">夜间静默时段</p>
                <p className="text-xs text-gray-400 mt-0.5">静默期间不发送任何通知</p>
              </div>
              <button
                onClick={() => updateConfig({ quietHoursEnabled: !config.quietHoursEnabled })}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  config.quietHoursEnabled
                    ? 'bg-duo-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {config.quietHoursEnabled ? '已开启' : '已关闭'}
              </button>
            </div>
            {config.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-gray-400">开始</span>
                  <input
                    type="time"
                    value={config.quietStart}
                    onChange={(event) => updateConfig({ quietStart: event.target.value })}
                    className="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-gray-400">结束</span>
                  <input
                    type="time"
                    value={config.quietEnd}
                    onChange={(event) => updateConfig({ quietEnd: event.target.value })}
                    className="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">喂奶间隔提醒</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  超过设定分钟未记录喂奶时提醒一次
                </p>
              </div>
              <button
                onClick={() =>
                  updateConfig({ feedingIntervalEnabled: !config.feedingIntervalEnabled })
                }
                className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  config.feedingIntervalEnabled
                    ? 'bg-duo-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {config.feedingIntervalEnabled ? '已开启' : '已关闭'}
              </button>
            </div>
            {config.feedingIntervalEnabled && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-400">提醒间隔（分钟）</p>
                <NumberField.Root
                  value={config.feedingIntervalMinutes}
                  onValueChange={(value) => {
                    if (value !== null) {
                      updateConfig({ feedingIntervalMinutes: value })
                    }
                  }}
                  min={60}
                  max={480}
                  step={15}
                >
                  <NumberField.Group className="flex items-center gap-2">
                    <NumberField.Decrement className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
                      −
                    </NumberField.Decrement>
                    <NumberField.Input className="w-14 text-center text-lg font-extrabold text-duo-blue bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <NumberField.Increment className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
                      +
                    </NumberField.Increment>
                  </NumberField.Group>
                </NumberField.Root>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">晚间胎动观察提醒</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  仅在孕晚期生效，晚间胎动偏少时提示复测
                </p>
              </div>
              <button
                onClick={() => updateConfig({ kickEveningEnabled: !config.kickEveningEnabled })}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  config.kickEveningEnabled
                    ? 'bg-duo-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {config.kickEveningEnabled ? '已开启' : '已关闭'}
              </button>
            </div>
            {config.kickEveningEnabled && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <p className="text-xs text-gray-400 mb-2">检查时段（小时）</p>
                  <NumberField.Root
                    value={config.kickCheckHour}
                    onValueChange={(value) => {
                      if (value !== null) {
                        updateConfig({ kickCheckHour: value })
                      }
                    }}
                    min={17}
                    max={23}
                    step={1}
                  >
                    <NumberField.Group className="flex items-center gap-2">
                      <NumberField.Decrement className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
                        −
                      </NumberField.Decrement>
                      <NumberField.Input className="w-14 text-center text-lg font-extrabold text-duo-orange bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                      <NumberField.Increment className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
                        +
                      </NumberField.Increment>
                    </NumberField.Group>
                  </NumberField.Root>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">最低胎动次数</p>
                  <NumberField.Root
                    value={config.kickMinCount}
                    onValueChange={(value) => {
                      if (value !== null) {
                        updateConfig({ kickMinCount: value })
                      }
                    }}
                    min={1}
                    max={10}
                    step={1}
                  >
                    <NumberField.Group className="flex items-center gap-2">
                      <NumberField.Decrement className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
                        −
                      </NumberField.Decrement>
                      <NumberField.Input className="w-14 text-center text-lg font-extrabold text-duo-orange bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                      <NumberField.Increment className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
                        +
                      </NumberField.Increment>
                    </NumberField.Group>
                  </NumberField.Root>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">预产期倒计时提醒</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  距离预产期 14/7/3/1 天时发送待产准备提示
                </p>
              </div>
              <button
                onClick={() => updateConfig({ prenatalEnabled: !config.prenatalEnabled })}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  config.prenatalEnabled
                    ? 'bg-duo-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {config.prenatalEnabled ? '已开启' : '已关闭'}
              </button>
            </div>
          </div>

          {!config.notificationsEnabled && (
            <p className="text-xs text-gray-400 text-center">
              你当前已关闭提醒总开关，上述规则会在重新开启后生效。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
