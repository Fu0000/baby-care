function formatMinutes(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 分钟'
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} 分钟`
}

interface TodayInteractionCardProps {
  sessions: number
  seconds: number
  onStart: () => void
}

export default function TodayInteractionCard(props: TodayInteractionCardProps) {
  const summary =
    props.sessions > 0
      ? `今日 ${props.sessions} 场 · ${formatMinutes(props.seconds)}`
      : '今天还没开始互动'

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            今日互动
          </p>
          <p className="text-sm font-extrabold text-gray-800 dark:text-white mt-1 truncate">
            🧸 {summary}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            短时高频更轻松，3 分钟也算一次。
          </p>
        </div>
        <button
          onClick={props.onStart}
          className="shrink-0 rounded-xl bg-duo-green text-white px-4 py-3 text-xs font-extrabold active:scale-[0.97] transition-transform"
        >
          {props.sessions > 0 ? '继续' : '开始'}
        </button>
      </div>
    </div>
  )
}

