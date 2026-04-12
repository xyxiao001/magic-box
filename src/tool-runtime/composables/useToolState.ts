import { ref, watch, type Ref } from 'vue'
import type { ToolModule } from '../protocols/tool-module'

export interface ToolRuntimeState<Input, Output> {
  input: Ref<Input>
  output: Ref<Output | null>
  error: Ref<string | null>
  loading: Ref<boolean>
  dirty: Ref<boolean>
  lastExecutedAt: Ref<number | null>
  reset: () => void
}

export function useToolState<Input, Output>(
  toolModule: Pick<ToolModule<Input, Output>, 'createInitialInput'>
): ToolRuntimeState<Input, Output> {
  const input = ref(toolModule.createInitialInput()) as Ref<Input>
  const output = ref<Output | null>(null) as Ref<Output | null>
  const error = ref<string | null>(null)
  const loading = ref(false)
  const dirty = ref(false)
  const lastExecutedAt = ref<number | null>(null)
  let isResetting = false

  watch(
    input,
    () => {
      if (isResetting) {
        return
      }

      dirty.value = true
    },
    {
      deep: true,
    }
  )

  function reset() {
    isResetting = true
    input.value = toolModule.createInitialInput()
    output.value = null
    error.value = null
    loading.value = false
    dirty.value = false
    lastExecutedAt.value = null
    queueMicrotask(() => {
      isResetting = false
    })
  }

  return {
    input,
    output,
    error,
    loading,
    dirty,
    lastExecutedAt,
    reset,
  }
}
