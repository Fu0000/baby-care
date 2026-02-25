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

function setAuthUser(userId: string): void {
  window.localStorage.setItem(
    'babycare-auth-session',
    JSON.stringify({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: userId,
        phone: '13800000000',
        nickname: null,
        inviteBound: true,
      },
    }),
  )
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
      motionLevel: 'medium',
      comfortMode: false,
      userStage: 'pregnancy_late',
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
    expect(window.localStorage.getItem('babycare-device-settings')).toContain('"colorMode":"light"')
    expect(window.localStorage.getItem('babycare-user-settings:guest')).not.toBeNull()
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

    const persisted = JSON.parse(window.localStorage.getItem('babycare-device-settings') ?? '{}')
    expect(persisted.colorMode).toBe('dark')
    expect(persisted.darkMode).toBeUndefined()
  })

  it('applies explicit color mode and persists via saveSettings', async () => {
    installMatchMedia(false)
    setAuthUser('user-1')
    const { saveSettings } = await loadSettingsModule()

    saveSettings({
      goalCount: 10,
      mergeWindowMinutes: 5,
      colorMode: 'dark',
      motionLevel: 'medium',
      comfortMode: true,
      userStage: 'newborn_0_3m',
      dueDate: null,
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('comfort-mode')).toBe(true)
    expect(document.documentElement.classList.contains('motion-low')).toBe(true)
    expect(window.localStorage.getItem('babycare-device-settings')).toContain('"colorMode":"dark"')
    expect(window.localStorage.getItem('babycare-user-settings:user-1')).toContain('"goalCount":10')
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

  it('uses user-scoped settings and shared device color mode', async () => {
    installMatchMedia(false)
    const { getSettings, saveSettings } = await loadSettingsModule()

    setAuthUser('user-a')
    saveSettings({
      goalCount: 12,
      mergeWindowMinutes: 3,
      colorMode: 'dark',
      motionLevel: 'low',
      comfortMode: false,
      userStage: 'pregnancy_late',
      dueDate: '2026-09-01',
    })

    setAuthUser('user-b')
    expect(getSettings()).toEqual({
      goalCount: 10,
      mergeWindowMinutes: 5,
      colorMode: 'dark',
      motionLevel: 'low',
      comfortMode: false,
      userStage: 'pregnancy_late',
      dueDate: null,
    })
  })
})
