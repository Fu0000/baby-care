import { getCurrentUserId } from './data-scope.ts'

export type ColorMode = 'system' | 'light' | 'dark'

export interface Settings {
  goalCount: number
  mergeWindowMinutes: number
  colorMode: ColorMode
  dueDate: string | null // ISO date string e.g. "2026-05-15"
}

interface UserSettings {
  goalCount: number
  mergeWindowMinutes: number
  dueDate: string | null
}

interface DeviceSettings {
  colorMode: ColorMode
}

const SETTINGS_KEY = 'babycare-settings'
const LEGACY_KEY = 'kick-counter-settings'
const DEVICE_SETTINGS_KEY = 'babycare-device-settings'
const USER_SETTINGS_KEY_PREFIX = 'babycare-user-settings'
const GUEST_SETTINGS_SCOPE = 'guest'

const defaultUserSettings: UserSettings = {
  goalCount: 10,
  mergeWindowMinutes: 5,
  dueDate: null,
}

const defaultDeviceSettings: DeviceSettings = {
  colorMode: 'system',
}

export function getSettings(): Settings {
  const userKey = getCurrentUserSettingsKey()
  migrateLegacyIfNeeded(userKey)

  const userSettings = readUserSettings(userKey)
  const deviceSettings = readDeviceSettings()

  return {
    ...defaultUserSettings,
    ...userSettings,
    ...defaultDeviceSettings,
    ...deviceSettings,
  }
}

export function saveSettings(settings: Settings): void {
  const userKey = getCurrentUserSettingsKey()

  const userSettings: UserSettings = {
    goalCount: settings.goalCount,
    mergeWindowMinutes: settings.mergeWindowMinutes,
    dueDate: settings.dueDate,
  }
  const deviceSettings: DeviceSettings = {
    colorMode: settings.colorMode,
  }

  localStorage.setItem(userKey, JSON.stringify(userSettings))
  localStorage.setItem(DEVICE_SETTINGS_KEY, JSON.stringify(deviceSettings))
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

function getCurrentUserSettingsKey(): string {
  return `${USER_SETTINGS_KEY_PREFIX}:${getCurrentUserId() ?? GUEST_SETTINGS_SCOPE}`
}

function migrateLegacyIfNeeded(userKey: string): void {
  const fallbackRaw = localStorage.getItem(LEGACY_KEY)
  if (fallbackRaw) {
    if (!localStorage.getItem(SETTINGS_KEY)) {
      localStorage.setItem(SETTINGS_KEY, fallbackRaw)
    }
    localStorage.removeItem(LEGACY_KEY)
  }

  const legacyRaw = localStorage.getItem(SETTINGS_KEY)
  if (!legacyRaw) return

  const legacyParsed = parseJson(legacyRaw)
  if (!legacyParsed) return

  if (!localStorage.getItem(DEVICE_SETTINGS_KEY)) {
    localStorage.setItem(
      DEVICE_SETTINGS_KEY,
      JSON.stringify({
        colorMode: resolveColorMode(legacyParsed),
      } satisfies DeviceSettings),
    )
  }

  if (!localStorage.getItem(userKey)) {
    localStorage.setItem(
      userKey,
      JSON.stringify({
        goalCount: getSafeNumber(legacyParsed.goalCount, defaultUserSettings.goalCount),
        mergeWindowMinutes: getSafeNumber(
          legacyParsed.mergeWindowMinutes,
          defaultUserSettings.mergeWindowMinutes,
        ),
        dueDate: typeof legacyParsed.dueDate === 'string' ? legacyParsed.dueDate : null,
      } satisfies UserSettings),
    )
  }
}

function readUserSettings(userKey: string): UserSettings {
  const parsed = parseJson(localStorage.getItem(userKey))
  if (!parsed) return defaultUserSettings

  return {
    goalCount: getSafeNumber(parsed.goalCount, defaultUserSettings.goalCount),
    mergeWindowMinutes: getSafeNumber(
      parsed.mergeWindowMinutes,
      defaultUserSettings.mergeWindowMinutes,
    ),
    dueDate: typeof parsed.dueDate === 'string' ? parsed.dueDate : null,
  }
}

function readDeviceSettings(): DeviceSettings {
  const parsed = parseJson(localStorage.getItem(DEVICE_SETTINGS_KEY))
  if (!parsed) return defaultDeviceSettings

  const colorMode = resolveColorMode(parsed)
  const normalized: DeviceSettings = { colorMode }

  const hasDarkMode = Object.prototype.hasOwnProperty.call(parsed, 'darkMode')
  if (hasDarkMode || parsed.colorMode !== colorMode) {
    localStorage.setItem(DEVICE_SETTINGS_KEY, JSON.stringify(normalized))
  }

  return normalized
}

function resolveColorMode(raw: Record<string, unknown>): ColorMode {
  if (
    raw.colorMode === 'system' ||
    raw.colorMode === 'light' ||
    raw.colorMode === 'dark'
  ) {
    return raw.colorMode
  }

  if (typeof raw.darkMode === 'boolean') {
    return raw.darkMode ? 'dark' : 'system'
  }

  return defaultDeviceSettings.colorMode
}

function getSafeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}
