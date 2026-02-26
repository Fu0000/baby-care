import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Checkbox } from '@base-ui/react/checkbox'
import { Collapsible } from '@base-ui/react/collapsible'
import { Progress } from '@base-ui/react/progress'
import confetti from 'canvas-confetti'
import { sileo } from 'sileo'
import StickyHeader from '../../../components/StickyHeader.tsx'
import { db, type HospitalBagItem } from '../../../lib/db.ts'
import { CATEGORIES, PRESET_ITEMS, type BagCategory } from '../../../lib/hospital-bag-presets.ts'
import { triggerHaptic } from '../../../lib/haptics.ts'
import { useCurrentUserId } from '../../../lib/data-scope.ts'

function nowMs(): number {
  return Date.now()
}

function CheckIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg fill="currentColor" width="10" height="10" viewBox="0 0 10 10" {...props}>
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  )
}

export default function HospitalBagHome() {
  const navigate = useNavigate()
  const [items, setItems] = useState<HospitalBagItem[]>([])
  const [expandedCategory, setExpandedCategory] = useState<BagCategory | null>('mom')
  const [newItemTexts, setNewItemTexts] = useState<Record<BagCategory, string>>({ mom: '', baby: '', documents: '' })
  const celebratedRef = useRef(false)
  const userId = useCurrentUserId()

  const seedPresets = useCallback(async (ownerId: string) => {
    const createdAt = nowMs()
    const records: HospitalBagItem[] = PRESET_ITEMS.map((item, i) => ({
      id: crypto.randomUUID(),
      userId: ownerId,
      category: item.category,
      name: item.name,
      checked: false,
      isCustom: false,
      sortOrder: i,
      createdAt,
    }))
    await db.hospitalBagItems.bulkAdd(records)
  }, [])

  useEffect(() => {
    let cancelled = false
    const scopeUserId = userId

    Promise.resolve()
      .then(async () => {
        if (!scopeUserId) return { kind: 'empty' } as const

        const count = await db.hospitalBagItems.where('userId').equals(scopeUserId).count()
        if (count === 0) await seedPresets(scopeUserId)

        const all = await db.hospitalBagItems.where('userId').equals(scopeUserId).toArray()
        all.sort((a, b) => a.sortOrder - b.sortOrder)
        return { kind: 'items', items: all } as const
      })
      .then((result) => {
        if (cancelled) return
        if (result.kind === 'empty') {
          setItems([])
        } else {
          setItems(result.items)
        }
      })

    return () => {
      cancelled = true
    }
  }, [seedPresets, userId])

  const total = items.length
  const checked = items.filter(i => i.checked).length
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0
  const isComplete = total > 0 && checked === total

  useEffect(() => {
    if (isComplete && !celebratedRef.current) {
      celebratedRef.current = true
      triggerHaptic('heavy')
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
      setTimeout(() => confetti({ particleCount: 40, spread: 90, origin: { y: 0.5 } }), 200)
    }
    if (!isComplete) {
      celebratedRef.current = false
    }
  }, [isComplete])

  async function toggleItem(id: string, currentChecked: boolean) {
    if (!userId) return
    const item = await db.hospitalBagItems.get(id)
    if (!item || item.userId !== userId) return
    const newChecked = !currentChecked
    await db.hospitalBagItems.update(id, { checked: newChecked })
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: newChecked } : i))
    triggerHaptic('light')
  }

  async function addCustomItem(category: BagCategory) {
    if (!userId) return
    const name = newItemTexts[category].trim()
    if (!name) return
    const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sortOrder)) : -1
    const newItem: HospitalBagItem = {
      id: crypto.randomUUID(),
      userId,
      category,
      name,
      checked: false,
      isCustom: true,
      sortOrder: maxSort + 1,
      createdAt: nowMs(),
    }
    await db.hospitalBagItems.add(newItem)
    setItems(prev => [...prev, newItem])
    setNewItemTexts(prev => ({ ...prev, [category]: '' }))
    triggerHaptic('light')
  }

  async function deleteCustomItem(id: string) {
    if (!userId) return
    const item = await db.hospitalBagItems.get(id)
    if (!item || item.userId !== userId) return
    await db.hospitalBagItems.delete(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function resetAll() {
    if (!userId) return
    await db.hospitalBagItems.where('userId').equals(userId).modify({ checked: false })
    setItems(prev => prev.map(i => ({ ...i, checked: false })))
    sileo.success({ title: '已重置', description: '所有物品已取消勾选' })
  }

  function getCategoryItems(category: BagCategory) {
    return items.filter(i => i.category === category)
  }

  return (
    <div className="max-w-lg mx-auto pb-4">
      <StickyHeader>
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 text-sm font-bold text-duo-orange active:opacity-60 transition-opacity"
          >
            ← 返回
          </button>
          <h1 className="text-xl font-extrabold text-gray-800 dark:text-white">
            待产包清单
          </h1>
        </div>
      </StickyHeader>

      <div className="px-4">
        {/* Progress Hero */}
        <div className="bg-duo-orange/10 dark:bg-duo-orange/15 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">准备进度</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{checked}/{total} 已准备</p>
            </div>
            <span className="text-3xl font-extrabold text-duo-orange">{percent}%</span>
          </div>
          <Progress.Root value={checked} max={total} className="h-3 bg-white/60 dark:bg-white/10 rounded-full overflow-hidden">
            <Progress.Track className="h-full rounded-full overflow-hidden">
              <Progress.Indicator className="h-full bg-duo-orange rounded-full transition-all duration-500 ease-out" />
            </Progress.Track>
          </Progress.Root>
        </div>

        {/* Completion Celebration */}
        {isComplete && (
          <div className="bg-duo-yellow/15 dark:bg-duo-yellow/10 rounded-2xl p-5 mb-6 text-center animate-bounce-in">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-lg font-extrabold text-gray-800 dark:text-white">待产包准备完成！</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">一切就绪，安心待产</p>
          </div>
        )}

        {/* Category Sections */}
        <div className="space-y-3 mb-6">
          {CATEGORIES.map(cat => {
            const catItems = getCategoryItems(cat.key)
            const catChecked = catItems.filter(i => i.checked).length

            return (
              <Collapsible.Root
                key={cat.key}
                open={expandedCategory === cat.key}
                onOpenChange={(open) => setExpandedCategory(open ? cat.key : null)}
              >
                <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                  <Collapsible.Trigger className="w-full px-5 py-4 flex items-center justify-between cursor-pointer outline-none">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${catChecked === catItems.length && catItems.length > 0 ? 'text-duo-orange' : 'text-gray-400 dark:text-gray-500'}`}>
                        {catChecked}/{catItems.length}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600 text-xs transition-transform duration-200">
                        {expandedCategory === cat.key ? '▲' : '▼'}
                      </span>
                    </div>
                  </Collapsible.Trigger>

                  <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-all duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                    <div className="px-5 pb-4">
                      <div className="space-y-0">
                        {catItems.map(item => (
                          <label
                            key={item.id}
                            className="flex items-center gap-3 py-2.5 cursor-pointer group"
                          >
                            <Checkbox.Root
                              checked={item.checked}
                              onCheckedChange={() => toggleItem(item.id, item.checked)}
                              className="flex size-5 shrink-0 items-center justify-center rounded-md transition-colors data-[checked]:bg-duo-orange data-[unchecked]:border-2 data-[unchecked]:border-gray-300 dark:data-[unchecked]:border-gray-600"
                            >
                              <Checkbox.Indicator className="flex text-white data-[unchecked]:hidden">
                                <CheckIcon className="size-3" />
                              </Checkbox.Indicator>
                            </Checkbox.Root>
                            <span className={`flex-1 text-sm transition-colors ${item.checked ? 'line-through text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                              {item.name}
                            </span>
                            {item.isCustom && (
                              <button
                                onClick={(e) => { e.preventDefault(); deleteCustomItem(item.id) }}
                                className="text-gray-300 dark:text-gray-600 hover:text-duo-red active:text-duo-red transition-colors text-sm"
                              >
                                ✕
                              </button>
                            )}
                          </label>
                        ))}
                      </div>

                      {/* Add custom item */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/40">
                        <input
                          type="text"
                          value={newItemTexts[cat.key]}
                          onChange={(e) => setNewItemTexts(prev => ({ ...prev, [cat.key]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') addCustomItem(cat.key) }}
                          placeholder="添加自定义物品..."
                          className="flex-1 text-sm bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none"
                        />
                        <button
                          onClick={() => addCustomItem(cat.key)}
                          disabled={!newItemTexts[cat.key].trim()}
                          className="text-xs font-bold text-duo-orange disabled:text-gray-300 dark:disabled:text-gray-600 transition-colors"
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  </Collapsible.Panel>
                </div>
              </Collapsible.Root>
            )
          })}
        </div>

        {/* Reset Button */}
        {checked > 0 && (
          <button
            onClick={resetAll}
            className="w-full py-3 text-sm font-bold text-gray-400 dark:text-gray-500 active:text-duo-red transition-colors"
          >
            重置清单
          </button>
        )}
      </div>
    </div>
  )
}
