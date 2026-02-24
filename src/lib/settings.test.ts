import { beforeEach, describe, expect, it, vi } from 'vitest'

interface ControlledMediaQueryList extends MediaQueryList {
  emitChange: (matches: boolean) => void
}

function installMatchMedia(initialMatches = false): ControlledMediaQueryList {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  const mediaQueryList = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((type: string, callback: EventListenerOrEventListenerObject) => {
      if (type !== 'change') return
      if (typeof callback === 'function') {
        listeners.add(callback as (event: MediaQueryListEvent) => void)
      }
    }),
    removeEventListener: vi.fn((type: string, callback: EventListenerOrEventListenerObject) => {
      if (type !== 'change') return
      if (typeof callback === 'function') {
        listeners.delete(callback as (event: MediaQueryListEvent) => void)
      }
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    emitChange(matches: boolean) {
      mediaQueryList.matches = matches
      const event = { matches, media: mediaQueryList.media } as MediaQueryListEvent
      for (const listener of listeners) listener(event)
    },
  } as ControlledMediaQueryList

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => mediaQueryList),
  })

  return mediaQueryList
}

async function loadSettingsModule() {
  vi.resetModules()
  return import('./settings.ts')
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.className = ''
})

describe('settings', () => {
  it('returns default settings when storage is empty', async () => {
    installMatchMedia(false)
    const { getSettings } = await loadSettingsModule()

    expect(getSettings()).toEqual({
      goalCount: 10,
      mergeWindowMinutes: 5,
      colorMode: 'system',
      dueDate: null,
    })
  })

  it('migrates legacy storage key', async () => {
    installMatchMedia(false)
    window.localStorage.setItem('kick-counter-settings', JSON.stringify({
      goalCount: 12,
      mergeWindowMinutes: 3,
      colorMode: 'light',
      dueDate: '2026-06-01',
    }))

    const { getSettings } = await loadSettingsModule()
    const settings = getSettings()

    expect(settings.goalCount).toBe(12)
    expect(settings.mergeWindowMinutes).toBe(3)
    expect(window.localStorage.getItem('kick-counter-settings')).toBeNull()
    expect(window.localStorage.getItem('babycare-settings')).not.toBeNull()
  })

  it('migrates old darkMode boolean to colorMode', async () => {
    installMatchMedia(false)
    window.localStorage.setItem('babycare-settings', JSON.stringify({
      goalCount: 9,
      mergeWindowMinutes: 5,
      darkMode: true,
      dueDate: null,
    }))

    const { getSettings } = await loadSettingsModule()
    const settings = getSettings()

    expect(settings.colorMode).toBe('dark')

    const persisted = JSON.parse(window.localStorage.getItem('babycare-settings') ?? '{}')
    expect(persisted.colorMode).toBe('dark')
    expect(persisted.darkMode).toBeUndefined()
  })

  it('applies explicit color mode and persists via saveSettings', async () => {
    installMatchMedia(false)
    const { saveSettings } = await loadSettingsModule()

    saveSettings({
      goalCount: 10,
      mergeWindowMinutes: 5,
      colorMode: 'dark',
      dueDate: null,
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem('babycare-settings')).toContain('"colorMode":"dark"')
  })

  it('follows system theme and updates on system changes', async () => {
    const mql = installMatchMedia(false)
    const { applyColorMode } = await loadSettingsModule()

    applyColorMode('system')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    mql.emitChange(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    applyColorMode('light')
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('computes due date countdown and pregnancy weeks', async () => {
    installMatchMedia(false)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))

    window.localStorage.setItem('babycare-settings', JSON.stringify({
      dueDate: '2026-01-11',
    }))

    const { getDaysUntilDue, getWeeksPregnant } = await loadSettingsModule()

    expect(getDaysUntilDue()).toBe(10)
    expect(getWeeksPregnant()).toBe(Math.floor((280 - 10) / 7))
  })
})
