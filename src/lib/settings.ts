export type ColorMode = 'system' | 'light' | 'dark'

export interface Settings {
  goalCount: number
  mergeWindowMinutes: number
  colorMode: ColorMode
  dueDate: string | null // ISO date string e.g. "2026-05-15"
}

const SETTINGS_KEY = 'babycare-settings'
const LEGACY_KEY = 'kick-counter-settings'

const defaultSettings: Settings = {
  goalCount: 10,
  mergeWindowMinutes: 5,
  colorMode: 'system',
  dueDate: null,
}

export function getSettings(): Settings {
  let raw = localStorage.getItem(SETTINGS_KEY)
  // Migrate from legacy key
  if (!raw) {
    raw = localStorage.getItem(LEGACY_KEY)
    if (raw) {
      localStorage.setItem(SETTINGS_KEY, raw)
      localStorage.removeItem(LEGACY_KEY)
    }
  }
  if (!raw) return defaultSettings
  const parsed = { ...defaultSettings, ...JSON.parse(raw) }
  // Migrate old boolean darkMode → colorMode
  if ('darkMode' in parsed && !('colorMode' in JSON.parse(raw))) {
    parsed.colorMode = parsed.darkMode ? 'dark' : 'system'
    delete (parsed as Record<string, unknown>).darkMode
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed))
  }
  return parsed
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  applyColorMode(settings.colorMode)
}

let _systemDarkQuery: MediaQueryList | null = null

export function applyColorMode(mode: ColorMode): void {
  if (mode === 'system') {
    if (!_systemDarkQuery) {
      _systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    }
    document.documentElement.classList.toggle('dark', _systemDarkQuery.matches)
    _systemDarkQuery.addEventListener('change', _onSystemChange)
  } else {
    _systemDarkQuery?.removeEventListener('change', _onSystemChange)
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }
}

function _onSystemChange(e: MediaQueryListEvent): void {
  document.documentElement.classList.toggle('dark', e.matches)
}

export function getDaysUntilDue(): number | null {
  const { dueDate } = getSettings()
  if (!dueDate) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}

/** Returns current pregnancy week (0-40+), or null if no due date set. */
export function getWeeksPregnant(): number | null {
  const days = getDaysUntilDue()
  if (days === null) return null
  // 40 weeks = 280 days total pregnancy
  return Math.floor((280 - days) / 7)
}
