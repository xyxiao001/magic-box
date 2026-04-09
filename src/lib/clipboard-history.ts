export interface ClipboardEntry {
  id: string
  text: string
  pinned: boolean
  createdAt: number
}

export function createClipboardEntry(text: string, now = Date.now()): ClipboardEntry {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    text: text.trim(),
    pinned: false,
    createdAt: now,
  }
}

export function insertClipboardEntry(entries: ClipboardEntry[], text: string, now = Date.now()) {
  const trimmed = text.trim()

  if (!trimmed) {
    return entries
  }

  const deduped = entries.filter((entry) => entry.text !== trimmed)
  return [createClipboardEntry(trimmed, now), ...deduped].slice(0, 50)
}

export function togglePinnedEntry(entries: ClipboardEntry[], id: string) {
  return entries.map((entry) => (entry.id === id ? { ...entry, pinned: !entry.pinned } : entry))
}

export function removeClipboardEntry(entries: ClipboardEntry[], id: string) {
  return entries.filter((entry) => entry.id !== id)
}

export function searchClipboardEntries(entries: ClipboardEntry[], query: string) {
  const normalized = query.trim().toLowerCase()
  const filtered = normalized
    ? entries.filter((entry) => entry.text.toLowerCase().includes(normalized))
    : entries

  return [...filtered].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1
    }

    return right.createdAt - left.createdAt
  })
}
