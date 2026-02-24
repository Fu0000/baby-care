import { describe, expect, it, vi } from 'vitest'
import { triggerHaptic } from './haptics.ts'

describe('haptics', () => {
  it('maps styles to vibration durations', () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: vibrate,
    })

    triggerHaptic('light')
    triggerHaptic('medium')
    triggerHaptic('heavy')

    expect(vibrate).toHaveBeenNthCalledWith(1, 10)
    expect(vibrate).toHaveBeenNthCalledWith(2, 25)
    expect(vibrate).toHaveBeenNthCalledWith(3, 50)
  })
})
