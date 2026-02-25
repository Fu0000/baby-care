import type { ReactNode } from 'react'
import { IconChildHeadOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconTimer2OutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconBagCheckOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconGlassFillDuo18 } from 'nucleo-ui-fill-duo-18'
import { getDaysUntilDue, getWeeksPregnant } from './settings.ts'

export interface ToolCard {
  id: string
  title: string
  icon: ReactNode
  path: string
  available: boolean
}

export const allTools: ToolCard[] = [
  {
    id: 'kick-counter',
    title: '数胎动',
    icon: <IconChildHeadOutlineDuo18 size={32} className="text-duo-blue" />,
    path: '/tools/kick-counter',
    available: true,
  },
  {
    id: 'contraction-timer',
    title: '宫缩计时',
    icon: <IconTimer2OutlineDuo18 size={32} className="text-pink-400" />,
    path: '/tools/contraction-timer',
    available: true,
  },
  {
    id: 'hospital-bag',
    title: '待产包',
    icon: <IconBagCheckOutlineDuo18 size={32} className="text-duo-orange" />,
    path: '/tools/hospital-bag',
    available: true,
  },
  {
    id: 'feeding-log',
    title: '喂奶记录',
    icon: <IconGlassFillDuo18 size={32} className="text-duo-purple" />,
    path: '/tools/feeding-log',
    available: true,
  },
  {
    id: 'reminders',
    title: '提醒中心',
    icon: <span className="text-[30px] leading-none">🔔</span>,
    path: '/tools/reminders',
    available: true,
  },
  {
    id: 'parent-child-play',
    title: '亲子互动',
    icon: <span className="text-[30px] leading-none">🧸</span>,
    path: '/tools/parent-child-play',
    available: true,
  },
]

/** Reorder tools based on pregnancy stage:
 *  - Before 28 weeks: contraction timer first
 *  - 28 weeks → due date: kick counter first (prime time for counting)
 *  - Past due date: contraction timer first (labor prep) */
export function getOrderedTools(): ToolCard[] {
  const weeks = getWeeksPregnant()
  const days = getDaysUntilDue()
  // Default order or 28+ weeks before due date → kick counter first
  if (weeks === null || (weeks >= 28 && days !== null && days > 0)) return allTools
  // Before 28 weeks or past due date → contraction timer first
  const reordered = [...allTools]
  const ctIdx = reordered.findIndex(t => t.id === 'contraction-timer')
  if (ctIdx > 0) {
    const [ct] = reordered.splice(ctIdx, 1)
    reordered.unshift(ct)
  }
  return reordered
}
