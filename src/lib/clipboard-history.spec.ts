import { describe, expect, it } from 'vitest'
import {
  insertClipboardEntry,
  removeClipboardEntry,
  searchClipboardEntries,
  togglePinnedEntry,
} from './clipboard-history'

describe('clipboard history helpers', () => {
  it('inserts and deduplicates entries', () => {
    const inserted = insertClipboardEntry([], 'hello', 1)
    const deduped = insertClipboardEntry(inserted, 'hello', 2)

    expect(deduped).toHaveLength(1)
    expect(deduped[0]?.createdAt).toBe(2)
  })

  it('toggles pin and sorts pinned first', () => {
    const entries = insertClipboardEntry(insertClipboardEntry([], 'a', 1), 'b', 2)
    const toggled = togglePinnedEntry(entries, entries[1].id)
    const searched = searchClipboardEntries(toggled, '')

    expect(searched[0]?.pinned).toBe(true)
  })

  it('removes entries', () => {
    const entries = insertClipboardEntry([], 'a', 1)

    expect(removeClipboardEntry(entries, entries[0].id)).toEqual([])
  })
})
