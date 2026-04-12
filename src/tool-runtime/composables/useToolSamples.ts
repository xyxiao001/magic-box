import { computed } from 'vue'
import type { ToolModule, ToolSample } from '../protocols/tool-module'
import type { ToolRuntimeState } from './useToolState'

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function useToolSamples<Input, Output>(
  toolModule: Pick<ToolModule<Input, Output>, 'meta' | 'samples'>,
  state: ToolRuntimeState<Input, Output>
) {
  const enabled = toolModule.meta.capabilities?.includes('sample-data') ?? false
  const samples = computed(() => (enabled ? (toolModule.samples ?? []) : []))

  function applySample(sample: ToolSample<Input>) {
    state.input.value = cloneValue(sample.apply(cloneValue(state.input.value)))
    state.error.value = null
  }

  return {
    sampleEnabled: enabled,
    samples,
    applySample,
  }
}
