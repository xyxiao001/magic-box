import { computed, ref, watch } from 'vue'
import { clearToolDraft, readToolDraft, writeToolDraft } from '../services/tool-draft-service'
import type { ToolRuntimeState } from './useToolState'
import type { ToolModule } from '../protocols/tool-module'

interface UseToolDraftOptions<Input> {
  legacyKeys?: string[]
  parseLegacy?: (raw: string, legacyKey: string) => Input | undefined
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function useToolDraft<Input, Output>(
  toolModule: Pick<ToolModule<Input, Output>, 'meta'>,
  state: ToolRuntimeState<Input, Output>,
  options: UseToolDraftOptions<Input> = {}
) {
  const enabled = toolModule.meta.capabilities?.includes('draft') ?? false
  const initialDraft = enabled
    ? readToolDraft<Input>(toolModule.meta.id, {
        legacyKeys: options.legacyKeys,
        parseLegacy: options.parseLegacy,
      })
    : null
  const hasDraftState = ref(initialDraft !== null)

  if (initialDraft !== null) {
    state.input.value = cloneValue(initialDraft)
  }

  watch(
    state.input,
    (value) => {
      if (!enabled) {
        return
      }

      writeToolDraft(toolModule.meta.id, cloneValue(value))
      hasDraftState.value = true
    },
    {
      deep: true,
    }
  )

  function clearDraft() {
    clearToolDraft(toolModule.meta.id)
    hasDraftState.value = false
  }

  function restoreDraft() {
    if (!enabled) {
      return false
    }

    const savedDraft = readToolDraft<Input>(toolModule.meta.id, {
      legacyKeys: options.legacyKeys,
      parseLegacy: options.parseLegacy,
    })

    if (savedDraft === null) {
      hasDraftState.value = false
      return false
    }

    state.input.value = cloneValue(savedDraft)
    hasDraftState.value = true
    return true
  }

  return {
    draftEnabled: enabled,
    hasDraft: computed(() => hasDraftState.value),
    clearDraft,
    restoreDraft,
  }
}
