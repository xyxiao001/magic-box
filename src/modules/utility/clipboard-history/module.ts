import { searchClipboardEntries, type ClipboardEntry } from './logic'
import { clipboardHistoryMeta } from './meta'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface ClipboardHistoryInput {
  entries: ClipboardEntry[]
  searchQuery: string
}

export interface ClipboardHistoryOutput {
  filteredEntries: ClipboardEntry[]
  totalCount: number
  pinnedCount: number
}

export function createClipboardHistoryInitialInput(): ClipboardHistoryInput {
  return {
    entries: [],
    searchQuery: '',
  }
}

export function executeClipboardHistory(input: ClipboardHistoryInput): ClipboardHistoryOutput {
  return {
    filteredEntries: searchClipboardEntries(input.entries, input.searchQuery),
    totalCount: input.entries.length,
    pinnedCount: input.entries.filter((entry) => entry.pinned).length,
  }
}

export const clipboardHistoryRuntimeModule: Omit<ToolModule<ClipboardHistoryInput, ClipboardHistoryOutput>, 'page'> = {
  meta: clipboardHistoryMeta,
  createInitialInput: createClipboardHistoryInitialInput,
  execute: (input) => executeClipboardHistory(input),
}
