import { IconChildHeadOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconGlassFillDuo18 } from 'nucleo-ui-fill-duo-18'
import { formatTimeSinceLastFeed } from '../../lib/feeding-helpers.ts'

interface TodayStatsCardProps {
  todayKicks: number
  todayFeeds: number
  completionRate: number
  lastFeedAt: number | null
  onOpenKicks: () => void
  onOpenFeeds: () => void
  onOpenCompletion: () => void
}

export default function TodayStatsCard(props: TodayStatsCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] p-4">
      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        今日关键统计
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={props.onOpenKicks}
          className="rounded-xl bg-duo-green/10 dark:bg-duo-green/15 px-3 py-3 text-left active:scale-[0.97] transition-transform"
        >
          <IconChildHeadOutlineDuo18 size={16} className="text-duo-green" />
          <p className="text-lg font-extrabold text-duo-green mt-1">{props.todayKicks}</p>
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">今日胎动</p>
        </button>

        <button
          onClick={props.onOpenFeeds}
          className="rounded-xl bg-duo-purple/10 dark:bg-duo-purple/15 px-3 py-3 text-left active:scale-[0.97] transition-transform"
        >
          <IconGlassFillDuo18 size={16} className="text-duo-purple" />
          <p className="text-lg font-extrabold text-duo-purple mt-1">{props.todayFeeds}</p>
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">今日喂养</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {props.lastFeedAt ? `上次 ${formatTimeSinceLastFeed(props.lastFeedAt)}` : '暂无记录'}
          </p>
        </button>

        <button
          onClick={props.onOpenCompletion}
          className="rounded-xl bg-duo-blue/10 dark:bg-duo-blue/15 px-3 py-3 text-left active:scale-[0.97] transition-transform"
        >
          <span className="text-sm">✅</span>
          <p className="text-lg font-extrabold text-duo-blue mt-1">{props.completionRate}%</p>
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">今日完成率</p>
        </button>
      </div>
    </div>
  )
}
