import type { ToolCard } from '../../lib/tools.tsx'

interface QuickRecordGridProps {
  tools: ToolCard[]
  onOpenTool: (tool: ToolCard) => void
}

interface ToolMeta {
  actionTitle: string
  subtitle: string
}

const TOOL_META_MAP: Record<string, ToolMeta> = {
  'kick-counter': {
    actionTitle: '+ 胎动记录',
    subtitle: '进入快速计数页',
  },
  'feeding-log': {
    actionTitle: '+ 喂奶记录',
    subtitle: '奶瓶/亲喂/吸奶',
  },
  'contraction-timer': {
    actionTitle: '开始宫缩计时',
    subtitle: '5-1-1 规则辅助',
  },
  reminders: {
    actionTitle: '提醒设置',
    subtitle: '夜间低打扰策略',
  },
  'parent-child-play': {
    actionTitle: '亲子互动',
    subtitle: '节奏与追光游戏',
  },
  'hospital-bag': {
    actionTitle: '待产包检查',
    subtitle: '按分类逐项核对',
  },
}

export default function QuickRecordGrid(props: QuickRecordGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {props.tools.map((tool) => {
        const meta = TOOL_META_MAP[tool.id] ?? {
          actionTitle: tool.title,
          subtitle: '进入工具页',
        }

        return (
          <button
            key={tool.id}
            onClick={() => props.onOpenTool(tool)}
            className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#16213e] px-4 py-4 text-left active:scale-[0.97] transition-transform"
          >
            <div className="flex items-center gap-2">
              <div className="shrink-0">{tool.icon}</div>
              <p className="text-sm font-extrabold text-gray-800 dark:text-white">{meta.actionTitle}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">{meta.subtitle}</p>
          </button>
        )
      })}
    </div>
  )
}
