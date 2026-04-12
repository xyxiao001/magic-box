import { computed } from 'vue'
import { useMessage } from '@/shared/composables/useMessage'
import type { ToolModule } from '../protocols/tool-module'
import type { ToolRuntimeState } from './useToolState'
import { downloadToolOutput, type ToolDownloadPayload } from '../services/tool-download-service'

interface UseToolDownloadOptions<Input, Output> {
  buildPayload: (input: Input, output: Output | null) => ToolDownloadPayload | null
  unavailableMessage?: string
  buildSuccessMessage?: (payload: ToolDownloadPayload) => string
}

export function useToolDownload<Input, Output>(
  toolModule: Pick<ToolModule<Input, Output>, 'meta'>,
  state: ToolRuntimeState<Input, Output>,
  options: UseToolDownloadOptions<Input, Output>
) {
  const { success: showSuccessMessage, error: showErrorMessage } = useMessage()
  const enabled = toolModule.meta.capabilities?.includes('download-output') ?? false
  const canDownload = computed(() => enabled && options.buildPayload(state.input.value, state.output.value) !== null)

  function download() {
    if (!enabled) {
      showErrorMessage('当前工具未接入下载能力')
      return false
    }

    const payload = options.buildPayload(state.input.value, state.output.value)

    if (!payload) {
      showErrorMessage(options.unavailableMessage ?? '当前没有可下载的结果')
      return false
    }

    const success = downloadToolOutput(payload)

    if (!success) {
      showErrorMessage('当前环境不支持下载')
      return false
    }

    showSuccessMessage(options.buildSuccessMessage?.(payload) ?? `已开始下载 ${payload.filename}`)
    return true
  }

  return {
    downloadEnabled: enabled,
    canDownload,
    download,
  }
}
