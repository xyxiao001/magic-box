import { describe, expect, it } from 'vitest'
import { createClipboardEntry } from './logic'
import {
  createClipboardHistoryInitialInput,
  executeClipboardHistory,
} from './module'

describe('clipboard history module', () => {
  it('filters entries and counts pinned items', () => {
    const input = createClipboardHistoryInitialInput()
    input.entries = [
      { ...createClipboardEntry('hello', 1), pinned: true },
      createClipboardEntry('world', 2),
    ]
    input.searchQuery = 'wo'

    const output = executeClipboardHistory(input)

    expect(output.totalCount).toBe(2)
    expect(output.pinnedCount).toBe(1)
    expect(output.filteredEntries).toHaveLength(1)
  })
})
