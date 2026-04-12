import { computed } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { useMessage } from '@/shared/composables/useMessage'
import type { ToolModule } from '../protocols/tool-module'
import type { ToolRuntimeState } from './useToolState'
import { buildToolShareUrl, readToolShareStateFromUrl } from '../services/tool-share-service'

interface UseToolShareOptions<Input, Output, SharedState> {
  buildShareState?: (input: Input, output: Output | null) => SharedState | null
  applySharedState?: (sharedState: SharedState) => void
  onRestored?: (sharedState: SharedState) => void
  unavailableMessage?: string
  buildSuccessMessage?: (shareUrl: string) => string
}

export function useToolShare<Input, Output, SharedState = Input>(
  toolModule: Pick<ToolModule<Input, Output>, 'meta'>,
  state: ToolRuntimeState<Input, Output>,
  options: UseToolShareOptions<Input, Output, SharedState> = {}
) {
  const { success: showSuccessMessage, error: showErrorMessage } = useMessage()
  const enabled = toolModule.meta.capabilities?.includes('share-url') ?? false
  const buildShareState = options.buildShareState ?? (((input: Input) => input as unknown as SharedState | null))
  const applySharedState =
    options.applySharedState ??
    ((sharedState: SharedState) => {
      state.input.value = sharedState as unknown as Input
      state.error.value = null
    })

  const shareUrl = computed(() => {
    if (!enabled) {
      return null
    }

    const sharedState = buildShareState(state.input.value, state.output.value)

    if (!sharedState) {
      return null
    }

    return buildToolShareUrl(toolModule.meta.path, sharedState)
  })

  function restoreSharedState() {
    if (!enabled) {
      return false
    }

    const sharedState = readToolShareStateFromUrl<SharedState>()

    if (!sharedState) {
      return false
    }

    applySharedState(sharedState)
    options.onRestored?.(sharedState)
    return true
  }

  async function copyShareUrl() {
    if (!enabled) {
      showErrorMessage('当前工具未接入分享能力')
      return false
    }

    const value = shareUrl.value

    if (!value) {
      showErrorMessage(options.unavailableMessage ?? '当前没有可分享的状态')
      return false
    }

    const copied = await copyToClipboard(value)

    if (!copied) {
      showErrorMessage('当前环境不支持复制')
      return false
    }

    showSuccessMessage(options.buildSuccessMessage?.(value) ?? '分享链接已复制')
    return true
  }

  return {
    shareEnabled: enabled,
    canShare: computed(() => Boolean(shareUrl.value)),
    shareUrl,
    restoreSharedState,
    copyShareUrl,
  }
}
