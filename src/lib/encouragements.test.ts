import { describe, expect, it, vi } from 'vitest'

async function loadModule() {
  vi.resetModules()
  return import('./encouragements.ts')
}

describe('encouragements', () => {
  it('never repeats the same message consecutively', async () => {
    const { getEncouragement } = await loadModule()
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.2)

    const first = getEncouragement()
    const second = getEncouragement()

    expect(first).not.toBe('')
    expect(second).not.toBe(first)
    expect(randomSpy).toHaveBeenCalledTimes(3)
  })
})
