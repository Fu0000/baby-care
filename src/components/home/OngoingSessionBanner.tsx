import type { KickSession } from '../../lib/db.ts'

interface OngoingSessionBannerProps {
  session: KickSession
  onContinue: () => void
}

export default function OngoingSessionBanner(props: OngoingSessionBannerProps) {
  return (
    <button
      onClick={props.onContinue}
      className="w-full flex items-center gap-3 bg-duo-green/10 dark:bg-duo-green/15 rounded-2xl px-5 py-4 active:scale-[0.98] transition-transform"
    >
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-duo-green opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-duo-green" />
      </span>
      <div className="flex-1 text-left">
        <p className="text-sm font-bold text-gray-800 dark:text-white">
          胎动记录中 · 点击继续
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          已记录 {props.session.kickCount} 次胎动
        </p>
      </div>
      <span className="text-xl font-extrabold text-duo-green">{props.session.kickCount}</span>
      <span className="text-gray-400 text-sm">→</span>
    </button>
  )
}
