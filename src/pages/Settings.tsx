import { useState } from 'react'
import { RadioGroup } from '@base-ui/react/radio-group'
import { Radio } from '@base-ui/react/radio'
import { NumberField } from '@base-ui/react/number-field'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { getSettings, saveSettings, type Settings as SettingsType, type ColorMode } from '../lib/settings.ts'
import { db } from '../lib/db.ts'

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType>(getSettings)
  const [exportDone, setExportDone] = useState(false)

  function update(patch: Partial<SettingsType>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  async function handleExport() {
    const [sessions, contractionSessions, contractions] = await Promise.all([
      db.sessions.toArray(),
      db.contractionSessions.toArray(),
      db.contractions.toArray(),
    ])
    const data = JSON.stringify({ sessions, contractionSessions, contractions }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `宝宝助手_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 2000)
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      const data = JSON.parse(text)
      let count = 0
      // Support both old format (array) and new format (object with keys)
      if (Array.isArray(data)) {
        await db.sessions.bulkPut(data)
        count = data.length
      } else {
        if (data.sessions) { await db.sessions.bulkPut(data.sessions); count += data.sessions.length }
        if (data.contractionSessions) { await db.contractionSessions.bulkPut(data.contractionSessions); count += data.contractionSessions.length }
        if (data.contractions) { await db.contractions.bulkPut(data.contractions); count += data.contractions.length }
      }
      alert('导入成功！共导入 ' + count + ' 条记录')
    }
    input.click()
  }

  async function handleClear() {
    await Promise.all([
      db.sessions.clear(),
      db.contractionSessions.clear(),
      db.contractions.clear(),
    ])
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-4" style={{ paddingTop: 'calc(var(--safe-area-top) + 2rem)' }}>
      <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-8 text-center">
        设置
      </h1>

      {/* Kick Settings Section */}
      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        胎动设置
      </p>
      <div className="space-y-3 mb-8">
        {/* Due Date */}
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">预产期</p>
              <p className="text-xs text-gray-400 mt-0.5">设置后首页显示倒计时</p>
            </div>
            <input
              type="date"
              value={settings.dueDate || ''}
              onChange={e => update({ dueDate: e.target.value || null })}
              className="bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-800 dark:text-white rounded-xl px-3 py-2 border-0 outline-none"
            />
          </div>
          {settings.dueDate && (
            <button
              onClick={() => update({ dueDate: null })}
              className="text-xs text-duo-red mt-2"
            >
              清除预产期
            </button>
          )}
        </div>

        {/* Goal Count */}
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">胎动目标次数</p>
              <p className="text-xs text-gray-400 mt-0.5">Cardiff 标准为 10 次</p>
            </div>
            <NumberField.Root
              value={settings.goalCount}
              onValueChange={(val) => {
                if (val !== null) update({ goalCount: val })
              }}
              min={1}
              max={50}
              step={1}
            >
              <NumberField.Group className="flex items-center gap-2">
                <NumberField.Decrement className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
                  −
                </NumberField.Decrement>
                <NumberField.Input className="w-10 text-center text-xl font-extrabold text-duo-green bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                <NumberField.Increment className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
                  +
                </NumberField.Increment>
              </NumberField.Group>
            </NumberField.Root>
          </div>
        </div>

        {/* Merge Window */}
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">
            合并窗口时长
          </p>
          <p className="text-xs text-gray-400 mb-3">
            窗口内的多次点击合并为 1 次有效胎动
          </p>
          <RadioGroup
            value={String(settings.mergeWindowMinutes)}
            onValueChange={(val) => update({ mergeWindowMinutes: Number(val) })}
            className="flex gap-2"
          >
            {[3, 5, 10].map(minutes => (
              <label key={minutes} className="flex-1">
                <Radio.Root
                  value={String(minutes)}
                  className="sr-only"
                />
                <span className={`block w-full py-2.5 rounded-xl text-sm font-bold text-center transition-colors cursor-pointer ${
                  settings.mergeWindowMinutes === minutes
                    ? 'bg-duo-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {minutes} 分钟
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* Appearance Section */}
      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        外观
      </p>
      <div className="space-y-3 mb-8">
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">外观模式</p>
          <p className="text-xs text-gray-400 mb-3">选择浅色、深色或跟随系统</p>
          <RadioGroup
            value={settings.colorMode}
            onValueChange={(val) => update({ colorMode: val as ColorMode })}
            className="flex gap-2"
          >
            {([['system', '系统'], ['light', '浅色'], ['dark', '深色']] as const).map(([mode, label]) => (
              <label key={mode} className="flex-1">
                <Radio.Root
                  value={mode}
                  className="sr-only"
                />
                <span className={`block w-full py-2.5 rounded-xl text-sm font-bold text-center transition-colors cursor-pointer ${
                  settings.colorMode === mode
                    ? 'bg-duo-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {label}
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* Data Management Section */}
      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        数据管理
      </p>
      <div className="space-y-3 mb-8">
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60 space-y-3">
          <button
            onClick={handleExport}
            className="w-full py-3 bg-duo-blue/10 text-duo-blue font-bold text-sm rounded-xl hover:bg-duo-blue/20 transition-colors"
          >
            {exportDone ? '✅ 导出成功！' : '📤 导出数据 (JSON)'}
          </button>

          <button
            onClick={handleImport}
            className="w-full py-3 bg-duo-purple/10 text-duo-purple font-bold text-sm rounded-xl hover:bg-duo-purple/20 transition-colors"
          >
            📥 导入数据
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <p className="text-[11px] font-bold text-duo-red/60 uppercase tracking-wider mb-3">
        危险操作
      </p>
      <div className="space-y-3 mb-8">
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-duo-red/20 dark:border-duo-red/15">
          <AlertDialog.Root>
            <AlertDialog.Trigger className="w-full py-3 font-bold text-sm rounded-xl bg-duo-red/10 text-duo-red hover:bg-duo-red/20 transition-colors cursor-pointer">
              🗑️ 清除所有数据
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
              <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-3rem)] max-w-sm bg-white dark:bg-[#16213e] rounded-3xl p-6 text-center transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
                <AlertDialog.Title className="text-xl font-extrabold text-gray-800 dark:text-white mb-2">
                  确认清除数据？
                </AlertDialog.Title>
                <AlertDialog.Description className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  此操作将删除所有胎动和宫缩记录，且无法恢复。
                </AlertDialog.Description>
                <div className="flex gap-3">
                  <AlertDialog.Close className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm rounded-xl transition-colors cursor-pointer">
                    取消
                  </AlertDialog.Close>
                  <AlertDialog.Close
                    className="flex-1 py-3 bg-duo-red text-white font-bold text-sm rounded-xl active:scale-95 transition-all cursor-pointer"
                    onClick={handleClear}
                  >
                    确认清除
                  </AlertDialog.Close>
                </div>
              </AlertDialog.Popup>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      </div>

      {/* About Section */}
      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        关于
      </p>
      <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">宝宝助手</p>
        <p className="text-xs text-gray-400">
          v2.0 · 为准妈妈用心打造
        </p>
        <p className="text-xs text-gray-400 mt-1">
          本应用仅为记录工具，不提供医学建议。
        </p>
      </div>
    </div>
  )
}
