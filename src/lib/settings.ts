export interface Settings {
  goalCount: number
  mergeWindowMinutes: number
  darkMode: boolean
}

const SETTINGS_KEY = 'kick-counter-settings'

const defaultSettings: Settings = {
  goalCount: 10,
  mergeWindowMinutes: 5,
  darkMode: false,
}

export function getSettings(): Settings {
  const raw = localStorage.getItem(SETTINGS_KEY)
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
