import { useState } from 'react'
import { getSettings, saveSettings, type Settings as SettingsType } from '../lib/settings.ts'
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
    const sessions = await db.sessions.toArray()
    const data = JSON.stringify(sessions, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `胎动记录_${new Date().toISOString().slice(0, 10)}.json`
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
      const sessions = JSON.parse(text)
      if (Array.isArray(sessions)) {
        await db.sessions.bulkPut(sessions)
        alert('导入成功！共导入 ' + sessions.length + ' 条记录')
      }
    }
    input.click()
  }

  async function handleClear() {
    if (!clearConfirm) {
      setClearConfirm(true)
      return
    }
    await db.sessions.clear()
    setClearConfirm(false)
    alert('所有记录已清除')
  }

  return (
    <div className="px-4 pt-8 pb-4">
      <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-6">
        ⚙️ 设置
      </h1>

      <div className="space-y-4">
        {/* Goal Count */}
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">目标次数</p>
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
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-4">
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
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
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

        {/* Dark Mode */}
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">深色模式</p>
              <p className="text-xs text-gray-400 mt-0.5">保护眼睛，夜间使用更舒适</p>
            </div>
            <button
              onClick={() => update({ darkMode: !settings.darkMode })}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                settings.darkMode ? 'bg-duo-green' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  settings.darkMode ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-gray-800 dark:text-white">数据管理</p>

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

        {/* About */}
        <div className="bg-white dark:bg-[#16213e] rounded-2xl p-4">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">关于</p>
          <p className="text-xs text-gray-400">
            数胎动 v1.0 · 为准妈妈用心打造
          </p>
          <p className="text-xs text-gray-400 mt-1">
            本应用仅为记录工具，不提供医学建议。
          </p>
        </div>
      </div>
    </div>
  )
}
