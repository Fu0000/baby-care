import type { DailyRhythmCard, JourneyCard, KickSafetyNotice } from '../../lib/journey.ts'

interface SecondaryInsightsPanelProps {
  collapsed: boolean
  onToggle: () => void
  journey: JourneyCard
  rhythm: DailyRhythmCard
  reminderSummary: string
  safetyNotice: KickSafetyNotice | null
}

function getJourneyToneClass(tone: JourneyCard['tone']): string {
  if (tone === 'orange') return 'border-duo-orange/40 bg-duo-orange/10 dark:bg-duo-orange/15'
  if (tone === 'purple') return 'border-duo-purple/40 bg-duo-purple/10 dark:bg-duo-purple/15'
  return 'border-duo-green/40 bg-duo-green/10 dark:bg-duo-green/15'
}

function getRhythmToneClass(tone: DailyRhythmCard['tone']): string {
  if (tone === 'orange') return 'border-duo-orange/40 bg-duo-orange/10 dark:bg-duo-orange/15'
  if (tone === 'blue') return 'border-duo-blue/40 bg-duo-blue/10 dark:bg-duo-blue/15'
  return 'border-duo-green/40 bg-duo-green/10 dark:bg-duo-green/15'
}

export default function SecondaryInsightsPanel(props: SecondaryInsightsPanelProps) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-4">
      <button
        onClick={props.onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            进阶洞察
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            本周重点、今日建议与安全提示
          </p>
        </div>
        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
          {props.collapsed ? '展开 ↓' : '收起 ↑'}
        </span>
      </button>

      {props.collapsed ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
            {props.journey.title}
          </span>
          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
            {props.rhythm.title}
          </span>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className={`rounded-2xl border px-4 py-3 ${getJourneyToneClass(props.journey.tone)}`}>
            <p className="text-sm font-extrabold text-gray-800 dark:text-white">{props.journey.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{props.journey.subtitle}</p>
            <div className="mt-3 space-y-1.5">
              {props.journey.tasks.map((task) => (
                <p key={task} className="text-xs font-bold text-gray-700 dark:text-gray-200">• {task}</p>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border px-4 py-3 ${getRhythmToneClass(props.rhythm.tone)}`}>
            <p className="text-sm font-extrabold text-gray-800 dark:text-white">{props.rhythm.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{props.rhythm.subtitle}</p>
            <div className="mt-3 space-y-1.5">
              {props.rhythm.tasks.map((task) => (
                <p key={task} className="text-xs font-bold text-gray-700 dark:text-gray-200">• {task}</p>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/40 bg-gray-50 dark:bg-gray-800 px-3 py-2 dark:border-white/10">
            <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
              {props.reminderSummary}
            </p>
          </div>

          {props.safetyNotice && (
            <div
              className={`rounded-xl border px-3 py-2 ${
                props.safetyNotice.level === 'warn'
                  ? 'border-duo-red/35 bg-duo-red/10'
                  : 'border-duo-blue/35 bg-duo-blue/10'
              }`}
            >
              <p
                className={`text-xs font-bold ${
                  props.safetyNotice.level === 'warn' ? 'text-duo-red' : 'text-duo-blue'
                }`}
              >
                {props.safetyNotice.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
