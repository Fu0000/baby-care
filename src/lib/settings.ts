export interface Settings {
  goalCount: number
  mergeWindowMinutes: number
  darkMode: boolean
  dueDate: string | null // ISO date string e.g. "2026-05-15"
}

const SETTINGS_KEY = 'babycare-settings'
const LEGACY_KEY = 'kick-counter-settings'

const defaultSettings: Settings = {
  goalCount: 10,
  mergeWindowMinutes: 5,
  darkMode: false,
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
  return { ...defaultSettings, ...JSON.parse(raw) }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  applyDarkMode(settings.darkMode)
}

export function applyDarkMode(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark)
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
