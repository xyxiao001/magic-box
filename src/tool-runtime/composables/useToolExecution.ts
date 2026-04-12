import type { ToolRuntimeState } from './useToolState'
import type { ToolModule } from '../protocols/tool-module'

interface ToolExecutionHooks<Input, Output> {
  onSuccess?: (payload: { input: Input; output: Output }) => void
  onError?: (payload: { input: Input; error: string }) => void
}

export function useToolExecution<Input, Output>(
  toolModule: Pick<ToolModule<Input, Output>, 'meta' | 'execute' | 'validate' | 'createInitialInput'>,
  state: ToolRuntimeState<Input, Output>,
  hooks: ToolExecutionHooks<Input, Output> = {}
) {
  async function run() {
    if (!toolModule.execute) {
      state.error.value = '当前工具暂未接入统一执行协议'
      return null
    }

    const validation = toolModule.validate?.(state.input.value)

    if (validation && !validation.ok) {
      state.error.value = validation.error ?? '输入校验失败'
      return null
    }

    state.loading.value = true
    state.error.value = null

    try {
      const output = await toolModule.execute(state.input.value, {
        toolId: toolModule.meta.id,
        now: new Date(),
      })

      state.output.value = output
      state.dirty.value = false
      state.lastExecutedAt.value = Date.now()
      hooks.onSuccess?.({
        input: state.input.value,
        output,
      })
      return output
    } catch (error) {
      const message = error instanceof Error ? error.message : '执行失败'
      state.error.value = message
      state.output.value = null
      hooks.onError?.({
        input: state.input.value,
        error: message,
      })
      return null
    } finally {
      state.loading.value = false
    }
  }

  function reset() {
    state.reset()
  }

  return {
    run,
    reset,
  }
}
