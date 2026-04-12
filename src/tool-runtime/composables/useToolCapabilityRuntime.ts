import { computed } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import type { ToolActionBarItem } from '@/components/toolkit/tool-action-bar'
import { useMessage } from '@/shared/composables/useMessage'
import type { ToolModule } from '../protocols/tool-module'
import type { ToolRuntimeState } from './useToolState'
import { useToolDownload } from './useToolDownload'
import { useToolDraft } from './useToolDraft'
import { useToolHistory } from './useToolHistory'
import { useToolSamples } from './useToolSamples'
import { useToolShare } from './useToolShare'
import type { ToolScaffoldHistoryPanel, ToolScaffoldSamplePanel } from '../scaffolds/types'

interface ToolCapabilityRuntimeControls<Output> {
  run?: () => Promise<Output | null>
  reset: () => void
}

type ToolCapabilityRuntimeModule<Input, Output> = Pick<
  ToolModule<Input, Output>,
  'meta' | 'runtime' | 'samples'
>

export function useToolCapabilityRuntime<Input, Output>(
  toolModule: ToolCapabilityRuntimeModule<Input, Output>,
  state: ToolRuntimeState<Input, Output>,
  controls: ToolCapabilityRuntimeControls<Output>
) {
  const runtime = toolModule.runtime ?? {}
  const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

  const draft = useToolDraft(toolModule, state, runtime.draft)
  const history = useToolHistory(toolModule, state, runtime.history ?? {})
  const download = useToolDownload(toolModule, state, runtime.download ?? {
    buildPayload: () => null,
  })
  const samples = useToolSamples(toolModule, state)
  const share = useToolShare(toolModule, state, {
    ...runtime.share,
    applySharedState: runtime.share?.applySharedState
      ? (sharedState) => {
          state.input.value = runtime.share!.applySharedState!(sharedState, state.input.value)
          state.error.value = null
        }
      : undefined,
  })

  async function copyOutput() {
    const buildText = runtime.copyOutput?.buildText

    if (!buildText) {
      showErrorMessage('当前工具未接入复制能力')
      return false
    }

    const text = buildText(state.input.value, state.output.value)

    if (!text) {
      showErrorMessage(runtime.copyOutput?.unavailableMessage ?? '当前没有可复制的结果')
      return false
    }

    const copied = await copyToClipboard(text)

    if (!copied) {
      showErrorMessage('当前环境不支持复制')
      return false
    }

    showSuccessMessage(runtime.copyOutput?.buildSuccessMessage?.(text) ?? '结果已复制')
    return true
  }

  function clearDraftAndReset() {
    if (draft.draftEnabled) {
      draft.clearDraft()
    }

    controls.reset()
  }

  function recordHistory(input: Input, output: Output | null) {
    if (!history.historyEnabled) {
      return
    }

    history.recordHistory(input, output)
  }

  function handleExecutionSuccess(input: Input, output: Output) {
    if (runtime.history?.mode === 'manual') {
      return
    }

    recordHistory(input, output)
  }

  async function restoreSharedState() {
    const restored = share.restoreSharedState()

    if (!restored) {
      return false
    }

    if (runtime.share?.autoRunOnRestore && controls.run) {
      await controls.run()
    }

    return true
  }

  function saveHistorySnapshot() {
    recordHistory(state.input.value, state.output.value)
    showSuccessMessage('已保存到历史记录')
  }

  const actionItems = computed<ToolActionBarItem[]>(() => {
    const items: ToolActionBarItem[] = []

    if (runtime.copyOutput) {
      items.push({
        id: 'copy-output',
        label: runtime.copyOutput.label ?? '复制结果',
        disabled: !runtime.copyOutput.buildText(state.input.value, state.output.value),
        onClick: async () => {
          await copyOutput()
        },
      })
    }

    if (runtime.download) {
      items.push({
        id: 'download-output',
        label: runtime.download.label ?? '下载结果',
        disabled: !download.canDownload.value,
        onClick: () => {
          download.download()
        },
      })
    }

    if (runtime.share) {
      items.push({
        id: 'share-url',
        label: runtime.share.label ?? '复制分享链接',
        disabled: !share.canShare.value,
        onClick: async () => {
          await share.copyShareUrl()
        },
      })
    }

    if (runtime.history?.mode === 'manual' && history.historyEnabled) {
      items.push({
        id: 'save-history',
        label: runtime.history.actionLabel ?? '保存快照',
        onClick: () => {
          saveHistorySnapshot()
        },
      })
    }

    if (draft.draftEnabled) {
      items.push({
        id: 'reset',
        label: runtime.draft?.resetLabel ?? '重置',
        onClick: clearDraftAndReset,
      })
    }

    return items
  })

  const samplePanel = computed<ToolScaffoldSamplePanel | null>(() => {
    if (!samples.sampleEnabled || !samples.samples.value.length) {
      return null
    }

    return {
      samples: samples.samples.value,
      onApply: (sampleId) => {
        const sample = samples.samples.value.find((item) => item.id === sampleId)

        if (sample) {
          samples.applySample(sample)
        }
      },
    }
  })

  const historyPanel = computed<ToolScaffoldHistoryPanel | null>(() => {
    if (!history.historyEnabled) {
      return null
    }

    return {
      entries: history.entries.value,
      emptyText: runtime.history?.emptyText,
      onRestore: (entry) => history.restoreEntry(entry as never),
      onRemove: history.removeEntry,
      onClear: history.clearHistoryEntries,
    }
  })

  return {
    draft,
    download,
    history,
    samples,
    share,
    actionItems,
    samplePanel,
    historyPanel,
    clearDraftAndReset,
    handleExecutionSuccess,
    restoreSharedState,
  }
}
