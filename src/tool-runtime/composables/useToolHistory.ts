import { computed, ref, type Ref } from 'vue'
import type { ToolRuntimeState } from './useToolState'
import type { ToolModule } from '../protocols/tool-module'
import {
  clearToolHistory,
  createToolHistoryEntry,
  readToolHistory,
  writeToolHistory,
  type ToolHistoryEntry,
} from '../services/tool-history-service'

interface HistoryEntryMeta {
  label: string
  description?: string
}

interface UseToolHistoryOptions<Input, Output> {
  limit?: number
  buildEntryMeta?: (input: Input, output: Output | null) => HistoryEntryMeta
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function useToolHistory<Input, Output>(
  toolModule: Pick<ToolModule<Input, Output>, 'meta'>,
  state: ToolRuntimeState<Input, Output>,
  options: UseToolHistoryOptions<Input, Output>
) {
  const enabled = toolModule.meta.capabilities?.includes('history') ?? false
  const limit = options.limit ?? 12
  const entries = ref<ToolHistoryEntry<Input, Output>[]>(
    enabled ? readToolHistory<Input, Output>(toolModule.meta.id) : []
  ) as Ref<ToolHistoryEntry<Input, Output>[]>

  function persist(nextEntries: ToolHistoryEntry<Input, Output>[]) {
    entries.value = nextEntries
    writeToolHistory(toolModule.meta.id, nextEntries)
  }

  function recordHistory(input: Input, output: Output | null) {
    if (!enabled) {
      return
    }

    const meta = options.buildEntryMeta?.(input, output) ?? {
      label: toolModule.meta.title,
    }

    const nextEntry = createToolHistoryEntry<Input, Output>(
      cloneValue(input) as Input,
      cloneValue(output) as Output | null,
      meta
    )
    persist([nextEntry, ...entries.value].slice(0, limit))
  }

  function restoreEntry(entry: ToolHistoryEntry<Input, Output>) {
    state.input.value = cloneValue(entry.input) as Input
    state.output.value = cloneValue(entry.output) as Output | null
    state.error.value = null
    state.loading.value = false
    state.dirty.value = false
  }

  function removeEntry(entryId: string) {
    persist(entries.value.filter((entry) => entry.id !== entryId))
  }

  function clearHistoryEntries() {
    entries.value = []
    clearToolHistory(toolModule.meta.id)
  }

  return {
    historyEnabled: enabled,
    entries: computed(() => entries.value),
    recordHistory,
    restoreEntry,
    removeEntry,
    clearHistoryEntries,
  }
}
