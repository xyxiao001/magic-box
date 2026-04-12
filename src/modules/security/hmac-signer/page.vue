<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage, removeStorage, writeStorage } from '@/lib/storage'
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
  buildHmacSignerDownloadPayload,
  buildHmacSignerHistoryLabel,
  createHmacSignerInitialInput,
  executeHmacSigner,
  hmacSignerRuntimeModule,
  type HmacSignerInput,
  type HmacSignerOutput,
} from './module'

const legacyDomain = 'tool-history:hmac-signer:state'
const secretDomain = 'tool-history:hmac-signer:secret-state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      secret: string
      persistSecret: boolean
      mode: HmacSignerInput['mode']
      message: string
      format: HmacSignerInput['format']
      target: string
      options: HmacSignerInput['options']
      request: HmacSignerInput['request']
    }>
  } catch {
    return undefined
  }
}

const legacyState = readStorage<ReturnType<typeof parseSavedState>>(secretDomain, undefined, {
  legacyKeys: [legacyDomain],
  parseLegacy: (raw) => parseSavedState(raw),
})

const secret = ref(legacyState?.persistSecret ? legacyState.secret ?? '' : '')
const persistSecret = ref(Boolean(legacyState?.persistSecret))

const runtimeModule = {
  ...hmacSignerRuntimeModule,
  execute: (input: HmacSignerInput) => executeHmacSigner(input, { secret: secret.value }),
}

const state = useToolState<HmacSignerInput, HmacSignerOutput>(runtimeModule)
const draft = useToolDraft(runtimeModule, state)
if (legacyState) {
  const initial = createHmacSignerInitialInput()
  if (
    state.input.value.mode === initial.mode &&
    state.input.value.message === initial.message &&
    state.input.value.format === initial.format &&
    state.input.value.target === initial.target
  ) {
    state.input.value = {
      ...state.input.value,
      mode: legacyState.mode ?? state.input.value.mode,
      message: legacyState.message ?? state.input.value.message,
      format: legacyState.format ?? state.input.value.format,
      target: legacyState.target ?? state.input.value.target,
      options: legacyState.options ?? state.input.value.options,
      request: legacyState.request ?? state.input.value.request,
    }
  }
}

const history = useToolHistory(runtimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildHmacSignerHistoryLabel(output) : 'HMAC 快照',
    description: output?.statusMessage ?? '',
  }),
})
const { run } = useToolExecution(runtimeModule, state)
const samples = useToolSamples(runtimeModule, state)
const download = useToolDownload(runtimeModule, state, {
  buildPayload: (_, output) => buildHmacSignerDownloadPayload(output),
})
const share = useToolShare(runtimeModule, state)
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

watch([secret, persistSecret], () => {
  if (persistSecret.value) {
    writeStorage(secretDomain, {
      secret: secret.value,
      persistSecret: true,
    })
    return
  }

  removeStorage(secretDomain)
})

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

const restoredSharedState = share.restoreSharedState()
const output = computed(() => state.output.value)

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  if (success) {
    showSuccessMessage(`${label}已复制`)
    return
  }
  showErrorMessage('当前环境不支持复制')
}

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
  void run()
}

function saveSnapshot() {
  if (!state.output.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

function clearAll() {
  draft.clearDraft()
  secret.value = ''
  persistSecret.value = false
  state.input.value = createHmacSignerInitialInput()
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
  <ToolScaffold :meta="runtimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="!output?.signatureHex && !output?.signatureBase64" @click="copyValue(state.input.value.format === 'hex' ? (output?.signatureHex || '') : (output?.signatureBase64 || ''), '签名')">
          复制签名
        </button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="输入" subtitle="Secret 不参与分享链接与历史快照，只在本地当前页面使用。">
        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="state.input.value.mode === 'basic'" @click="state.input.value.mode = 'basic'">基础模式</button>
          <button type="button" class="tab-button" :data-active="state.input.value.mode === 'request'" @click="state.input.value.mode = 'request'">请求模式</button>
        </div>

        <label class="field-row">
          <span class="field-label">Secret</span>
          <input v-model="secret" class="text-input" type="password" placeholder="输入 HMAC secret" />
        </label>

        <label class="field-row">
          <span class="field-label">保留 Secret</span>
          <select v-model="persistSecret" class="select-input">
            <option :value="false">否</option>
            <option :value="true">是</option>
          </select>
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <template v-if="state.input.value.mode === 'basic'">
          <label class="field-row">
            <span class="field-label">原文</span>
            <textarea v-model="state.input.value.message" class="text-area text-area-full" spellcheck="false" />
          </label>
        </template>

        <template v-else>
          <div class="json-diff-editor-grid">
            <label class="field-row">
              <span class="field-label">Method</span>
              <input v-model="state.input.value.request.method" class="text-input" type="text" />
            </label>
            <label class="field-row">
              <span class="field-label">Path</span>
              <input v-model="state.input.value.request.path" class="text-input" type="text" />
            </label>
          </div>

          <div class="json-diff-editor-grid">
            <label class="field-row">
              <span class="field-label">Query</span>
              <input v-model="state.input.value.request.query" class="text-input" type="text" />
            </label>
            <label class="field-row">
              <span class="field-label">Timestamp</span>
              <input v-model="state.input.value.request.timestamp" class="text-input" type="text" />
            </label>
          </div>

          <div class="json-diff-editor-grid">
            <label class="field-row">
              <span class="field-label">Nonce</span>
              <input v-model="state.input.value.request.nonce" class="text-input" type="text" />
            </label>
            <label class="field-row">
              <span class="field-label">输出格式</span>
              <select v-model="state.input.value.format" class="select-input">
                <option value="hex">hex</option>
                <option value="base64">base64</option>
              </select>
            </label>
          </div>

          <label class="field-row">
            <span class="field-label">Body</span>
            <textarea v-model="state.input.value.request.body" class="text-area text-area-full" spellcheck="false" />
          </label>
        </template>

        <label class="field-row">
          <span class="field-label">目标签名</span>
          <input v-model="state.input.value.target" class="text-input" type="text" placeholder="可选：粘贴现有签名做比对" />
        </label>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的 HMAC 计算结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<HmacSignerInput, HmacSignerOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="结果" :subtitle="output?.statusMessage || '等待输入'">
        <ToolPanel title="签名结果">
          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">HEX</span>
                <strong class="result-value">{{ output?.signatureHex || '—' }}</strong>
              </div>
            </article>
            <article class="data-row">
              <div>
                <span class="result-label">BASE64</span>
                <strong class="result-value">{{ output?.signatureBase64 || '—' }}</strong>
              </div>
            </article>
            <article class="data-row">
              <div>
                <span class="result-label">比对结果</span>
                <strong class="result-value">{{ output?.compare.matched ? '匹配' : '未匹配' }}</strong>
              </div>
            </article>
          </div>
        </ToolPanel>

        <ToolPanel title="Canonical Message">
          <textarea :value="output?.canonicalMessage || ''" class="text-area text-area-compact" readonly />
        </ToolPanel>

        <ToolPanel title="Effective Message">
          <textarea :value="output?.effectiveMessage || ''" class="text-area text-area-full" readonly />
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
