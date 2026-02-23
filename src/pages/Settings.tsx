import { useState } from 'react'
import { getSettings, saveSettings, type Settings as SettingsType, type ColorMode } from '../lib/settings.ts'
import { db } from '../lib/db.ts'

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType>(getSettings)
  const [exportDone, setExportDone] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)

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
    if (!clearConfirm) {
      setClearConfirm(true)
      return
    }
    await Promise.all([
      db.sessions.clear(),
      db.contractionSessions.clear(),
      db.contractions.clear(),
    ])
    setClearConfirm(false)
    alert('所有记录已清除')
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
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">胎动目标次数</p>
              <p className="text-xs text-gray-400 mt-0.5">Cardiff 标准为 10 次</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => update({ goalCount: Math.max(1, settings.goalCount - 1) })}
                className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform"
              >
                −
              </button>
              <span className="text-xl font-extrabold text-duo-green w-10 text-center">
                {settings.goalCount}
              </span>
              <button
                onClick={() => update({ goalCount: Math.min(50, settings.goalCount + 1) })}
                className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center active:scale-90 transition-transform"
              >
                +
              </button>
            </div>
          </label>
        </div>

        {/* Merge Window */}
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">
            合并窗口时长
          </p>
          <p className="text-xs text-gray-400 mb-3">
            窗口内的多次点击合并为 1 次有效胎动
          </p>
          <div className="flex gap-2">
            {[3, 5, 10].map(minutes => (
              <button
                key={minutes}
                onClick={() => update({ mergeWindowMinutes: minutes })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  settings.mergeWindowMinutes === minutes
                    ? 'bg-duo-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {minutes} 分钟
              </button>
            ))}
          </div>
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
          <div className="flex gap-2">
            {([['system', '系统'], ['light', '浅色'], ['dark', '深色']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => update({ colorMode: mode as ColorMode })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  settings.colorMode === mode
                    ? 'bg-duo-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
          <button
            onClick={handleClear}
            className={`w-full py-3 font-bold text-sm rounded-xl transition-colors ${
              clearConfirm
                ? 'bg-duo-red text-white'
                : 'bg-duo-red/10 text-duo-red hover:bg-duo-red/20'
            }`}
          >
            {clearConfirm ? '⚠️ 确认清除所有数据？再点一次确认' : '🗑️ 清除所有数据'}
          </button>
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
