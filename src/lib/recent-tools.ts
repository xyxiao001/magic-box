import { readStorage, writeStorage } from '@/lib/storage'

const RECENT_TOOLS_DOMAIN = 'recent-tools'
const RECENT_TOOLS_LIMIT = 8

export interface RecentToolEntry {
  id: string
  usedAt: number
  count: number
}

function isRecentToolEntry(value: unknown): value is RecentToolEntry {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RecentToolEntry>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.usedAt === 'number' &&
    Number.isFinite(candidate.usedAt) &&
    typeof candidate.count === 'number' &&
    Number.isFinite(candidate.count)
  )
}

export function sanitizeRecentToolEntries(entries: unknown, validToolIds: string[]) {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries
    .filter(isRecentToolEntry)
    .filter((entry, index, all) => {
      return validToolIds.includes(entry.id) && all.findIndex((item) => item.id === entry.id) === index
    })
    .sort((left, right) => right.usedAt - left.usedAt)
    .slice(0, RECENT_TOOLS_LIMIT)
}

export function readRecentToolEntries(validToolIds: string[]) {
  const entries = readStorage<RecentToolEntry[]>(RECENT_TOOLS_DOMAIN, [])
  return sanitizeRecentToolEntries(entries, validToolIds)
}

export function writeRecentToolEntries(entries: RecentToolEntry[]) {
  writeStorage(RECENT_TOOLS_DOMAIN, entries)
}

export function recordRecentToolVisit(entries: RecentToolEntry[], toolId: string, usedAt = Date.now()) {
  const currentEntry = entries.find((entry) => entry.id === toolId)
  const nextEntry: RecentToolEntry = {
    id: toolId,
    usedAt,
    count: (currentEntry?.count ?? 0) + 1,
  }

  return [nextEntry, ...entries.filter((entry) => entry.id !== toolId)].slice(0, RECENT_TOOLS_LIMIT)
}
