<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { useMessage } from '@/shared/composables/useMessage'
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
  buildQrcodeStudioHistoryLabel,
  qrcodeStudioRuntimeModule,
  type QrcodeStudioInput,
  type QrcodeStudioOutput,
} from './module'

const storageDomain = 'tool-history:qrcode-studio:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<QrcodeStudioInput>
  } catch {
    return undefined
  }
}

const state = useToolState<QrcodeStudioInput, QrcodeStudioOutput>(qrcodeStudioRuntimeModule)
const draft = useToolDraft(qrcodeStudioRuntimeModule, state, {
  legacyKeys: [storageDomain],
  parseLegacy: (raw) => ({
    ...state.input.value,
    ...parseSavedState(raw),
  }),
})
const history = useToolHistory(qrcodeStudioRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildQrcodeStudioHistoryLabel(output) : '二维码快照',
    description: output?.downloadName || '',
  }),
})
const { run } = useToolExecution(qrcodeStudioRuntimeModule, state)
const samples = useToolSamples(qrcodeStudioRuntimeModule, state)
const share = useToolShare(qrcodeStudioRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const restoredSharedState = share.restoreSharedState()
const output = computed(() => state.output.value)
const sizeOptions = [192, 256, 320, 384, 512]
const marginOptions = [1, 2, 4]
const statusMessage = computed(() => {
  if (state.loading.value) return '正在生成二维码'
  if (state.error.value) return state.error.value
  if (output.value?.dataUrl) return '二维码已更新，可直接下载 PNG'
  return '输入内容后会自动生成二维码'
})
const statusTone = computed<'neutral' | 'success' | 'danger'>(() => {
  if (state.error.value) return 'danger'
  if (output.value?.dataUrl) return 'success'
  return 'neutral'
})

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
  void run()
}

async function copyContent() {
  const success = await copyToClipboard(state.input.value.content)
  if (success) {
    showSuccessMessage('二维码内容已复制')
    return
  }
  showErrorMessage('当前环境不支持复制')
}

function clearContent() {
  draft.clearDraft()
  state.input.value.content = ''
}

function downloadQrCode() {
  if (!output.value?.dataUrl) {
    showErrorMessage('当前没有可下载的二维码')
    return
  }

  const anchor = document.createElement('a')
  anchor.href = output.value.dataUrl
  anchor.download = output.value.downloadName
  anchor.click()
  showSuccessMessage(`已开始下载 ${output.value.downloadName}`)
}

function saveSnapshot() {
  if (!state.output.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

onMounted(() => {
  if (!restoredSharedState) {
    void run()
  }
})
</script>

<template>
  <ToolScaffold :meta="qrcodeStudioRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="!output?.dataUrl || state.loading.value" @click="downloadQrCode">
          {{ state.loading.value ? '生成中...' : '下载 PNG' }}
        </button>
        <button type="button" class="ghost-button" @click="copyContent">复制内容</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearContent">清空内容</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="配置区" :subtitle="statusMessage" :badge="output?.type || '未输入'">
        <label class="field-row">
          <span class="field-label">内容</span>
          <textarea
            v-model="state.input.value.content"
            class="text-area qrcode-content-input"
            spellcheck="false"
            placeholder="https://example.com 或任意文本"
          />
        </label>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">尺寸</span>
            <select v-model="state.input.value.size" class="select-input">
              <option v-for="size in sizeOptions" :key="size" :value="size">{{ size }} px</option>
            </select>
          </label>

          <label class="field-row">
            <span class="field-label">边距</span>
            <select v-model="state.input.value.margin" class="select-input">
              <option v-for="margin in marginOptions" :key="margin" :value="margin">{{ margin }}</option>
            </select>
          </label>
        </div>

        <div class="qrcode-color-grid">
          <label class="field-row qrcode-color-field">
            <span class="field-label">前景色</span>
            <div class="qrcode-color-input">
              <input v-model="state.input.value.foreground" class="color-swatch" type="color" />
              <input v-model="state.input.value.foreground" class="text-input" type="text" />
            </div>
          </label>

          <label class="field-row qrcode-color-field">
            <span class="field-label">背景色</span>
            <div class="qrcode-color-input">
              <input v-model="state.input.value.background" class="color-swatch" type="color" />
              <input v-model="state.input.value.background" class="text-input" type="text" />
            </div>
          </label>
        </div>

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
        empty-text="保存一次快照后，这里会记录最近的二维码配置。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<QrcodeStudioInput, QrcodeStudioOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="预览区" subtitle="常见链接、文本和 Wi-Fi 载荷都可以直接放进来生成。">
        <p class="helper-text" :class="{ 'helper-text-success': statusTone === 'success', 'helper-text-danger': statusTone === 'danger' }">
          {{ statusMessage }}
        </p>

        <section class="qrcode-preview-panel">
          <div v-if="output?.dataUrl" class="qrcode-preview-shell">
            <img class="qrcode-preview-image" :src="output.dataUrl" :alt="`QR code for ${output.type}`" />
          </div>
          <div v-else class="empty-panel">
            <p>输入内容后会在这里出现二维码预览。</p>
          </div>
        </section>

        <section class="qrcode-meta-panel">
          <div class="data-list">
            <div class="data-row">
              <div>
                <span class="result-label">类型</span>
                <strong class="result-value">{{ output?.type || '未输入' }}</strong>
              </div>
              <div>
                <span class="result-label">下载名</span>
                <strong class="result-value">{{ output?.downloadName || 'magic-box-qr.png' }}</strong>
              </div>
            </div>

            <div class="data-row">
              <div>
                <span class="result-label">前景色</span>
                <strong class="result-value">{{ state.input.value.foreground }}</strong>
              </div>
              <div>
                <span class="result-label">背景色</span>
                <strong class="result-value">{{ state.input.value.background }}</strong>
              </div>
            </div>
          </div>
        </section>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
