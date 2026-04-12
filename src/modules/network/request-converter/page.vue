<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ErrorBanner from '@/components/toolkit/ErrorBanner.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage, writeStorage } from '@/lib/storage'
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
  buildRequestConverterDownloadPayload,
  buildRequestConverterHistoryLabel,
  getRequestConverterActiveOutput,
  type RequestConverterInput,
  type RequestConverterOutput,
  type RequestConverterOutputTab,
  requestConverterRuntimeModule,
} from './module'

const inputStorageKey = 'magic-box.request-converter.curl'
const tabStorageKey = 'magic-box.request-converter.tab'
const tabDomain = 'tool-history:request-converter:tab'

function parseStoredTab(raw: string) {
  if (raw === 'structured' || raw === 'fetch' || raw === 'axios' || raw === 'node-fetch') {
    return raw
  }

  return undefined
}

const state = useToolState<RequestConverterInput, RequestConverterOutput>(requestConverterRuntimeModule)
const draft = useToolDraft(requestConverterRuntimeModule, state, {
  legacyKeys: ['tool-history:request-converter:curl', inputStorageKey],
  parseLegacy: (raw) => ({
    curlInput: raw,
  }),
})
const history = useToolHistory(requestConverterRuntimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label: output ? buildRequestConverterHistoryLabel(output) : 'Request Converter',
    description: input.curlInput.split('\n')[0] || '最近一次 cURL 转换结果',
  }),
})
const { run } = useToolExecution(requestConverterRuntimeModule, state, {
  onSuccess: ({ input, output }) => {
    history.recordHistory(input, output)
  },
})
const download = useToolDownload(requestConverterRuntimeModule, state, {
  buildPayload: (_, output) => buildRequestConverterDownloadPayload(output, activeTab.value),
})
const samples = useToolSamples(requestConverterRuntimeModule, state)
const share = useToolShare(requestConverterRuntimeModule, state, {
  buildShareState: (input) => ({
    input,
    activeTab: activeTab.value,
  }),
  applySharedState: (sharedState) => {
    state.input.value = sharedState.input
    activeTab.value = sharedState.activeTab ?? 'structured'
  },
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const activeTab = ref<RequestConverterOutputTab>(
  readStorage<RequestConverterOutputTab>(tabDomain, 'structured', {
    legacyKeys: [tabStorageKey],
    parseLegacy: (raw) => parseStoredTab(raw),
  })
)

const activeOutput = computed(() => getRequestConverterActiveOutput(state.output.value, activeTab.value))

share.restoreSharedState()

watch(activeTab, (value) => {
  writeStorage(tabDomain, value)
})

async function copyValue(value: string, label: string) {
  const copied = await copyToClipboard(value)

  if (copied) {
    showSuccessMessage(`${label}已复制`)
    return
  }

  showErrorMessage('当前环境不支持复制')
}

function clearAll() {
  draft.clearDraft()
  state.input.value.curlInput = ''
  state.output.value = null
  state.error.value = null
}

onMounted(() => {
  void run()
})
</script>

<template>
  <ToolScaffold :meta="requestConverterRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #input>
      <ToolPaneShell
        title="cURL 输入"
        subtitle="粘贴 cURL 后自动解析，并生成 fetch / axios / node fetch 片段。"
        :badge="state.output.value?.parsed.method ?? '—'"
      >
        <label class="field-row">
          <span class="field-label">cURL</span>
          <textarea
            v-model="state.input.value.curlInput"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="粘贴 curl 命令，例如：curl -X POST https://... -H 'Content-Type: application/json' -d '{...}'"
          />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="(sampleId) => samples.applySample(samples.samples.value.find((sample) => sample.id === sampleId)!)"
        />

        <ToolActionBar>
          <button type="button" class="solid-button" @click="run">解析 cURL</button>
          <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载输出</button>
          <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
          <button type="button" class="ghost-button" @click="clearAll">清空</button>
        </ToolActionBar>

        <p v-if="state.output.value" class="helper-text">解析成功，可在右侧切换输出格式并复制。</p>
        <ErrorBanner
          v-else-if="state.error.value"
          title="解析失败"
          :message="state.error.value"
          hint="请检查引号、Header 和 body 参数是否完整。"
        />
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="成功解析一次 cURL 后，这里会记录最近的转换结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<RequestConverterInput, RequestConverterOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="输出" subtitle="先看结构化视图确认 method、url、header、body，再复制代码片段。">
        <ToolActionBar>
          <button
            type="button"
            class="tab-button"
            :data-active="activeTab === 'structured'"
            @click="activeTab = 'structured'"
          >
            结构化
          </button>
          <button type="button" class="tab-button" :data-active="activeTab === 'fetch'" @click="activeTab = 'fetch'">fetch</button>
          <button type="button" class="tab-button" :data-active="activeTab === 'axios'" @click="activeTab = 'axios'">axios</button>
          <button
            type="button"
            class="tab-button"
            :data-active="activeTab === 'node-fetch'"
            @click="activeTab = 'node-fetch'"
          >
            Node fetch
          </button>
        </ToolActionBar>

        <ToolPanel v-if="activeTab === 'structured'" title="Request Config">
          <template #actions>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!state.output.value"
              @click="copyValue(state.output.value?.configJson ?? '', '配置 JSON')"
            >
              复制
            </button>
          </template>

          <textarea
            :value="state.output.value?.configJson ?? ''"
            class="text-area text-area-full"
            readonly
            placeholder="解析结果会显示在这里"
          />
        </ToolPanel>

        <ToolPanel v-else title="代码片段">
          <template #actions>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!state.output.value"
              @click="copyValue(activeOutput, '代码')"
            >
              复制
            </button>
          </template>

          <textarea
            :value="activeOutput"
            class="text-area text-area-full"
            readonly
            placeholder="解析成功后，这里会生成代码"
          />
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
