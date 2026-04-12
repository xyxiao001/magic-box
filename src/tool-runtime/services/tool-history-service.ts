import { readStorage, removeStorage, writeStorage } from '@/lib/storage'

export interface ToolHistoryEntry<Input = unknown, Output = unknown> {
  id: string
  createdAt: string
  label: string
  description?: string
  input: Input
  output: Output | null
}

function createToolHistoryDomain(toolId: string) {
  return `tool-runtime:${toolId}:history`
}

function createEntryId() {
  return `history_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function readToolHistory<Input, Output>(toolId: string) {
  return readStorage<ToolHistoryEntry<Input, Output>[]>(createToolHistoryDomain(toolId), [])
}

export function writeToolHistory<Input, Output>(toolId: string, entries: ToolHistoryEntry<Input, Output>[]) {
  writeStorage(createToolHistoryDomain(toolId), entries)
}

export function clearToolHistory(toolId: string) {
  removeStorage(createToolHistoryDomain(toolId))
}

export function createToolHistoryEntry<Input, Output>(
  input: Input,
  output: Output | null,
  meta: {
    label: string
    description?: string
  }
): ToolHistoryEntry<Input, Output> {
  return {
    id: createEntryId(),
    createdAt: new Date().toISOString(),
    label: meta.label,
    description: meta.description,
    input,
    output,
  }
}
