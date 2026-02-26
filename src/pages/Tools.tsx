import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import StickyHeader from '../components/StickyHeader.tsx'
import { getDaysUntilDue, getSettings, getWeeksPregnant } from '../lib/settings.ts'
import { getGroupedEntryTools } from '../lib/tools.tsx'
import { trackToolOpen } from '../lib/tool-usage.ts'

export default function Tools() {
  const navigate = useNavigate()
  const settings = getSettings()
  const daysUntilDue = getDaysUntilDue()
  const weeksPregnant = getWeeksPregnant()
  const hour = new Date().getHours()

  const { recent, groups } = useMemo(
    () =>
      getGroupedEntryTools(
        {
          userStage: settings.userStage,
          hour,
          weeksPregnant,
          daysUntilDue,
        },
        { includeRecent: true, recentLimit: 6 },
      ),
    [daysUntilDue, hour, settings.userStage, weeksPregnant],
  )

  function openTool(path: string, toolId: string): void {
    trackToolOpen(toolId)
    navigate(path)
  }

  return (
    <div className="max-w-lg mx-auto pb-4">
      <StickyHeader>
        <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white text-center">
          工具
        </h1>
      </StickyHeader>

      <div className="px-4">
        {recent.length > 0 && (
          <div className="mb-8">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              最近使用
            </p>
            <div className="grid grid-cols-3 gap-2">
              {recent.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => openTool(tool.path, tool.id)}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] px-3 py-3 text-center active:scale-[0.97] transition-transform"
                >
                  <div className="mx-auto mb-1 w-fit">{tool.icon}</div>
                  <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-tight">
                    {tool.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                {group.title}
              </p>

              <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/40">
                  <p className="text-sm font-extrabold text-gray-800 dark:text-white">
                    {group.title}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {group.description}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 p-4">
                  {group.tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => openTool(tool.path, tool.id)}
                      className="flex min-h-[6.6rem] flex-col items-center justify-center rounded-2xl px-3 py-3 text-center transition-transform duration-150 border border-gray-200 bg-gray-50 active:scale-[0.96] dark:border-gray-700/60 dark:bg-gray-800"
                    >
                      <div className="mb-2">{tool.icon}</div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">
                        {tool.title}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

