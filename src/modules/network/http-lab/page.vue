<script setup lang="ts">
import { computed } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { formatJson } from '@/lib/json-tool'
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
  buildHttpLabDownloadPayload,
  buildHttpLabHistoryLabel,
  httpLabRuntimeModule,
  type HttpLabInput,
  type HttpLabOutput,
} from './module'

const httpStateDomain = 'tool-history:http-lab:request'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<HttpLabInput>
  } catch {
    return undefined
  }
}

const state = useToolState<HttpLabInput, HttpLabOutput>(httpLabRuntimeModule)
useToolDraft(httpLabRuntimeModule, state, {
  legacyKeys: [httpStateDomain],
  parseLegacy: (raw) => ({
    ...state.input.value,
    ...parseSavedState(raw),
  }),
})
const history = useToolHistory(httpLabRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildHttpLabHistoryLabel(output) : 'HTTP 快照',
    description: output ? `${output.durationText} · ${output.sizeText}` : '',
  }),
})
const { run } = useToolExecution(httpLabRuntimeModule, state)
const samples = useToolSamples(httpLabRuntimeModule, state)
const download = useToolDownload(httpLabRuntimeModule, state, {
  buildPayload: (_, output) => buildHttpLabDownloadPayload(output),
})
const share = useToolShare(httpLabRuntimeModule, state)
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const supportsRequestBody = computed(
  () => state.input.value.method === 'POST' || state.input.value.method === 'PUT'
)
const bodyPlaceholder = computed(() =>
  supportsRequestBody.value ? '{\n  "name": "Magic Box"\n}' : '当前 Method 默认不发送请求体'
)

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
  state.output.value = null
  state.error.value = null
}

function formatRequestBody() {
  const raw = state.input.value.body.trim()
  if (!raw) {
    showErrorMessage('当前没有可格式化的请求体')
    return
  }

  const result = formatJson(state.input.value.body)
  if (!result.ok || !result.value) {
    showErrorMessage(result.error ?? '请求体不是有效 JSON')
    return
  }

  state.input.value.body = result.value
  showSuccessMessage('请求体已格式化')
}

async function copyValue(value: string, label: string) {
  if (!value) {
    showErrorMessage(`当前没有可复制的${label}`)
    return
  }

  const success = await copyToClipboard(value)
  if (success) {
    showSuccessMessage(`${label}已复制`)
    return
  }

  showErrorMessage('当前环境不支持复制')
}

async function sendRequest() {
  const output = await run()
  if (output) {
    showSuccessMessage(output.ok ? '请求完成' : '请求返回错误状态码')
  }
}

function clearResponse() {
  state.output.value = null
  state.error.value = null
}

function saveSnapshot() {
  if (!state.output.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}
</script>

<template>
  <ToolScaffold :meta="httpLabRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="state.loading.value" @click="sendRequest">
          {{ state.loading.value ? '请求中...' : '发送请求' }}
        </button>
        <button type="button" class="ghost-button" @click="formatRequestBody">格式化 Body</button>
        <button type="button" class="ghost-button" @click="clearResponse">清空响应</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载响应</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="请求构造" subtitle="先把最常用的联调路径做顺：方法、地址、请求头和原始 JSON。">
        <div class="http-composer-grid">
          <label class="field-row http-method-field">
            <span class="field-label">Method</span>
            <select v-model="state.input.value.method" class="select-input">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </label>

          <label class="field-row">
            <span class="field-label">Request URL</span>
            <input v-model="state.input.value.url" class="text-input" type="url" placeholder="https://api.example.com/users/1" />
          </label>
        </div>

        <label class="field-row">
          <span class="field-label">Headers</span>
          <textarea v-model="state.input.value.headers" class="text-area text-area-compact" spellcheck="false" />
        </label>

        <label class="field-row">
          <span class="field-label">Raw JSON Body</span>
          <textarea v-model="state.input.value.body" class="text-area http-body-input" spellcheck="false" :placeholder="bodyPlaceholder" />
        </label>

        <p class="meta-hint">
          {{ supportsRequestBody ? 'POST / PUT 会发送当前请求体；如果像 JSON，会自动补上 Content-Type。' : 'GET / DELETE 默认不发送请求体，但仍可提前准备模板。' }}
        </p>

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
        empty-text="发送一次请求并保存快照后，这里会记录最近的响应结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<HttpLabInput, HttpLabOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="响应结果" :subtitle="state.output.value ? state.output.value.statusText : '尚未发送请求'">
        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">响应摘要</span>
          </div>
          <div class="data-list">
            <div class="data-row">
              <div><span class="result-label">Status</span><strong class="result-value">{{ state.output.value?.statusText || '未发起' }}</strong></div>
              <div><span class="result-label">Duration</span><strong class="result-value">{{ state.output.value?.durationText || '—' }}</strong></div>
            </div>
            <div class="data-row">
              <div><span class="result-label">Content-Type</span><strong class="result-value">{{ state.output.value?.contentType || '—' }}</strong></div>
              <div><span class="result-label">Size</span><strong class="result-value">{{ state.output.value?.sizeText || '—' }}</strong></div>
            </div>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Response Body</span>
            <button type="button" class="ghost-button small-button" :disabled="!state.output.value?.responseBody" @click="copyValue(state.output.value?.responseBody || '', '响应体')">复制</button>
          </div>
          <textarea :value="state.output.value?.responseBody || ''" class="text-area http-response-body" readonly placeholder="响应体会显示在这里" />
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Response Headers</span>
            <button type="button" class="ghost-button small-button" :disabled="!state.output.value?.responseHeaders" @click="copyValue(state.output.value?.responseHeaders || '', '响应头')">复制</button>
          </div>
          <textarea :value="state.output.value?.responseHeaders || ''" class="text-area text-area-compact" readonly placeholder="响应头会显示在这里" />
        </section>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
