interface StageProgressBarProps {
  title: string
  subtitle: string
  progress: number
  tone?: 'green' | 'blue' | 'purple' | 'orange'
}

function getToneClass(tone: StageProgressBarProps['tone']): string {
  if (tone === 'blue') return 'bg-duo-blue'
  if (tone === 'purple') return 'bg-duo-purple'
  if (tone === 'orange') return 'bg-duo-orange'
  return 'bg-duo-green'
}

export default function StageProgressBar(props: StageProgressBarProps) {
  const progress = Math.max(0, Math.min(100, Math.round(props.progress)))

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-gray-800 dark:text-white">{props.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{props.subtitle}</p>
        </div>
        <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400">{progress}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getToneClass(props.tone)}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
