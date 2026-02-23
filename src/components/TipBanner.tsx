import { useState, useEffect } from 'react'
import { getRandomTip } from '../lib/tips.ts'

export default function TipBanner() {
  const [tip, setTip] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 50% chance to show a tip
    if (Math.random() < 0.5) {
      setTip(getRandomTip())
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="mx-4 mt-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-slide-up">
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0">💡</span>
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-1">你知道吗？</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{tip}</p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="shrink-0 text-gray-400 hover:text-gray-600 ml-auto"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
