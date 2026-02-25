interface ToolUsageEntry {
  count: number
  lastUsedAt: number
}

export type ToolUsageMap = Record<string, ToolUsageEntry>

const TOOL_USAGE_KEY = 'babycare-tool-usage'

export function trackToolOpen(toolId: string, now = Date.now()): void {
  if (!toolId) return
  const snapshot = readToolUsage()
  const current = snapshot[toolId]
  snapshot[toolId] = {
    count: (current?.count ?? 0) + 1,
    lastUsedAt: now,
  }
  localStorage.setItem(TOOL_USAGE_KEY, JSON.stringify(snapshot))
}

export function getToolUsage(): ToolUsageMap {
  return readToolUsage()
}

function readToolUsage(): ToolUsageMap {
  const raw = localStorage.getItem(TOOL_USAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}

    const output: ToolUsageMap = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue
      const item = value as Record<string, unknown>
      if (
        typeof item.count !== 'number' ||
        !Number.isFinite(item.count) ||
        typeof item.lastUsedAt !== 'number' ||
        !Number.isFinite(item.lastUsedAt)
      ) {
        continue
      }
      output[key] = {
        count: Math.max(0, Math.round(item.count)),
        lastUsedAt: item.lastUsedAt,
      }
    }
    return output
  } catch {
    return {}
  }
}
