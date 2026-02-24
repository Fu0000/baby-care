import { describe, expect, it, vi } from 'vitest'
import { getRandomTip } from './tips.ts'

describe('tips', () => {
  it('returns a deterministic tip when random is stubbed', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(getRandomTip()).toBe('每天固定时间数胎动，宝宝的活动会更有规律哦～')
  })
})
