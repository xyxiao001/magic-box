<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage } from '@/lib/storage'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDownload } from '@/tool-runtime/composables/useToolDownload'
import { useToolDraft } from '@/tool-runtime/composables/useToolDraft'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolHistory } from '@/tool-runtime/composables/useToolHistory'
import { useToolSamples } from '@/tool-runtime/composables/useToolSamples'
import { useToolShare } from '@/tool-runtime/composables/useToolShare'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolSamplePanel from '@/tool-runtime/scaffolds/ToolSamplePanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import {
  buildCodecLabDownloadPayload,
  buildCodecLabHistoryLabel,
  codecLabRuntimeModule,
  createCodecLabInitialInput,
  type CodecLabInput,
  type CodecLabOutput,
} from './module'

const codecStateDomain = 'tool-history:codec-lab:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<CodecLabInput>
  } catch {
    return undefined
  }
}

const savedState = readStorage<Partial<CodecLabInput>>(codecStateDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const state = useToolState<CodecLabInput, CodecLabOutput>(codecLabRuntimeModule)
const draft = useToolDraft(codecLabRuntimeModule, state, {
  legacyKeys: [codecStateDomain],
  parseLegacy: (raw) => parseSavedState(raw),
})
const history = useToolHistory(codecLabRuntimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label: output ? buildCodecLabHistoryLabel(input, output) : `${input.mode === 'url' ? 'URL' : 'Base64'} 快照`,
    description: output ? (output.result.ok ? output.result.value?.slice(0, 48) ?? '' : output.result.error ?? '') : '',
  }),
})
const { run } = useToolExecution(codecLabRuntimeModule, state)
const samples = useToolSamples(codecLabRuntimeModule, state)
const download = useToolDownload(codecLabRuntimeModule, state, {
  buildPayload: (_, output) => buildCodecLabDownloadPayload(output),
})
const share = useToolShare(codecLabRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const defaultInput = createCodecLabInitialInput()
if (
  state.input.value.input === defaultInput.input &&
  state.input.value.mode === defaultInput.mode &&
  state.input.value.action === defaultInput.action
) {
  state.input.value = {
    ...state.input.value,
    ...savedState,
  }
}

const restoredSharedState = share.restoreSharedState()
const codecResult = computed(() => state.output.value?.result)
const codecActions = computed(() =>
  state.input.value.mode === 'url'
    ? [
        { value: 'decode-all' as const, label: '全部解码' },
        { value: 'decode' as const, label: '解码 1 层' },
        { value: 'encode' as const, label: 'URL 编码' },
      ]
    : [
        { value: 'decode' as const, label: 'Base64 解码' },
        { value: 'encode' as const, label: 'Base64 编码' },
      ]
)
const resultHint = computed(() => {
  if (!codecResult.value) {
    return '等待输入'
  }

  if (!codecResult.value.ok) {
    return codecResult.value.error
  }

  if (state.input.value.mode === 'url' && state.input.value.action === 'decode-all') {
    const layers = codecResult.value.iterations ?? 0
    return layers > 0 ? `已自动解码 ${layers} 层` : '未检测到可继续解码的 URL 编码'
  }

  if (state.input.value.mode === 'url' && state.input.value.action === 'decode') {
    return '已解码 1 层'
  }

  return '转换完成'
})

watch(
  () => state.input.value.mode,
  (mode) => {
    if (mode === 'url') {
      if (state.input.value.action === 'decode-all') {
        return
      }

      state.input.value.action = 'decode-all'
      return
    }

    if (state.input.value.action === 'decode-all') {
      state.input.value.action = 'decode'
    }
  }
)

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)

  if (!sample) {
    return
  }

  samples.applySample(sample)
  void run()
}

async function copyOutput() {
  if (!codecResult.value?.ok || !codecResult.value.value) {
    showErrorMessage(codecResult.value?.error ?? '没有可复制的内容')
    return
  }

  const success = await copyToClipboard(codecResult.value.value)
  if (success) {
    showSuccessMessage('结果已复制')
    return
  }

  showErrorMessage('当前环境不支持复制')
}

function saveSnapshot() {
  if (!state.output.value) {
    return
  }

  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

function clearAll() {
  draft.clearDraft()
  state.input.value.input = ''
  state.output.value = null
  state.error.value = null
}

onMounted(() => {
  if (!restoredSharedState) {
    void run()
  }
})
</script>

<template>
  <ToolScaffold :meta="codecLabRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="!codecResult?.ok || !codecResult?.value" @click="copyOutput">复制结果</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空输入</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="输入" subtitle="支持 URL 与 Base64 编解码，适合接口调试和临时转换。">
        <div class="field-row">
          <span class="field-label">模式</span>
          <div class="tab-row">
            <button type="button" class="tab-button" :data-active="state.input.value.mode === 'url'" @click="state.input.value.mode = 'url'">URL</button>
            <button type="button" class="tab-button" :data-active="state.input.value.mode === 'base64'" @click="state.input.value.mode = 'base64'">
              Base64
            </button>
          </div>
        </div>

        <div class="field-row">
          <span class="field-label">操作</span>
          <div class="tab-row">
            <button
              v-for="action in codecActions"
              :key="action.value"
              type="button"
              class="tab-button"
              :data-active="state.input.value.action === action.value"
              @click="state.input.value.action = action.value"
            >
              {{ action.label }}
            </button>
          </div>
        </div>

        <label class="field-row">
          <span class="field-label">内容</span>
          <textarea v-model="state.input.value.input" class="text-area text-area-full" spellcheck="false" placeholder="输入需要转换的内容" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的编解码结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<CodecLabInput, CodecLabOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="输出" :subtitle="resultHint || '等待输入'">
        <textarea
          :value="codecResult?.ok ? codecResult.value : codecResult?.error || ''"
          class="text-area text-area-full"
          readonly
          placeholder="转换结果会显示在这里"
        />
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
