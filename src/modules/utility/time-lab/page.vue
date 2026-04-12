<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { copyToClipboard } from '@/lib/clipboard'
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
  buildTimeLabDownloadPayload,
  buildTimeLabHistoryLabel,
  timeLabRuntimeModule,
  type TimeLabInput,
  type TimeLabOutput,
} from './module'

const timeInputDomain = 'tool-history:time-lab:input'

const state = useToolState<TimeLabInput, TimeLabOutput>(timeLabRuntimeModule)
const draft = useToolDraft(timeLabRuntimeModule, state, {
  legacyKeys: [timeInputDomain],
  parseLegacy: (raw) => ({
    input: raw,
  }),
})
const history = useToolHistory(timeLabRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: buildTimeLabHistoryLabel(output ?? { ok: false, error: '', result: null }),
    description: output?.result?.iso ?? output?.error ?? '',
  }),
})
const { run } = useToolExecution(timeLabRuntimeModule, state)
const samples = useToolSamples(timeLabRuntimeModule, state)
const download = useToolDownload(timeLabRuntimeModule, state, {
  buildPayload: (_, output) => buildTimeLabDownloadPayload(output),
})
const share = useToolShare(timeLabRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const restoredSharedState = share.restoreSharedState()
const output = computed(() => state.output.value)
const timeRows = computed(() => {
  if (!output.value?.result) {
    return []
  }

  return [
    { label: 'ISO', value: output.value.result.iso },
    { label: '本地时间', value: output.value.result.local },
    { label: 'UTC', value: output.value.result.utc },
    { label: 'Unix 秒', value: output.value.result.unixSeconds },
    { label: 'Unix 毫秒', value: output.value.result.unixMilliseconds },
  ]
})

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)

  if (success) {
    showSuccessMessage(`${label}已复制`)
    return
  }

  showErrorMessage('当前环境不支持复制')
}

function fillCurrentTime() {
  state.input.value.input = String(Date.now())
}

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)

  if (!sample) {
    return
  }

  samples.applySample(sample)
  void run()
}

function saveSnapshot() {
  if (!state.output.value?.ok) {
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
  <ToolScaffold :meta="timeLabRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="fillCurrentTime">当前时间</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value?.ok" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="输入" subtitle="支持 10 位秒级、13 位毫秒级时间戳，以及标准日期字符串。">
        <label class="field-row">
          <span class="field-label">时间内容</span>
          <textarea v-model="state.input.value.input" class="text-area text-area-compact" spellcheck="false" placeholder="输入时间戳或日期字符串" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <p class="helper-text" :class="{ 'helper-text-danger': !output?.ok }">
          {{ output?.ok ? '识别成功。' : output?.error || '等待输入' }}
        </p>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的时间转换结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<TimeLabInput, TimeLabOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="结果" subtitle="点击右侧按钮可复制单项结果。">
        <div v-if="timeRows.length" class="data-list">
          <article v-for="row in timeRows" :key="row.label" class="data-row">
            <div>
              <span class="result-label">{{ row.label }}</span>
              <strong class="result-value">{{ row.value }}</strong>
            </div>
            <button type="button" class="ghost-button small-button" @click="copyValue(row.value, row.label)">复制</button>
          </article>
        </div>

        <div v-else class="empty-panel">
          <p>输入有效时间后，这里会显示完整转换结果。</p>
        </div>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
