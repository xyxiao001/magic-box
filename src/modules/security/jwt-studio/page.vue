<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
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
  buildJwtStudioDownloadPayload,
  buildJwtStudioHistoryLabel,
  jwtStudioRuntimeModule,
  type JwtStudioInput,
  type JwtStudioOutput,
} from './module'

const storageKey = 'magic-box.jwt-studio.token'
const storageDomain = 'tool-history:jwt-studio:token'

const state = useToolState<JwtStudioInput, JwtStudioOutput>(jwtStudioRuntimeModule)
const draft = useToolDraft(jwtStudioRuntimeModule, state, {
  legacyKeys: [storageDomain, storageKey],
  parseLegacy: (raw) => ({
    tokenInput: raw,
  }),
})
const history = useToolHistory(jwtStudioRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildJwtStudioHistoryLabel(output) : 'JWT 快照',
    description: output?.parsed.summary ?? '最近一次 JWT 解析结果',
  }),
})
const { run } = useToolExecution(jwtStudioRuntimeModule, state)
const samples = useToolSamples(jwtStudioRuntimeModule, state)
const download = useToolDownload(jwtStudioRuntimeModule, state, {
  buildPayload: (_, output) => buildJwtStudioDownloadPayload(output),
})
const share = useToolShare(jwtStudioRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const restoredSharedState = share.restoreSharedState()
const parsed = computed(() => state.output.value?.parsed)
const statusLabel = computed(() => {
  if (!parsed.value) {
    return '无效'
  }

  if (parsed.value.status === 'active') {
    return '有效'
  }

  if (parsed.value.status === 'expired') {
    return '已过期'
  }

  if (parsed.value.status === 'not-yet-valid') {
    return '未生效'
  }

  return '无效'
})
const statusTone = computed<'neutral' | 'success' | 'danger'>(() => {
  if (!parsed.value) {
    return 'neutral'
  }

  if (parsed.value.status === 'active') {
    return 'success'
  }

  if (parsed.value.status === 'invalid' || parsed.value.status === 'expired') {
    return 'danger'
  }

  return 'neutral'
})

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

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)

  if (!sample) {
    return
  }

  samples.applySample(sample)
  void run()
}

function clearInput() {
  draft.clearDraft()
  state.input.value.tokenInput = ''
  state.output.value = null
  state.error.value = null
}

function saveSnapshot() {
  if (!state.output.value) {
    return
  }

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
  <ToolScaffold :meta="jwtStudioRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="!state.input.value.tokenInput" @click="copyValue(state.input.value.tokenInput, '原始 token')">
          复制 Token
        </button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearInput">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="Token 输入" subtitle="只在本地解析 header / payload，不上传到外部服务。" :badge="statusLabel">
        <label class="field-row">
          <span class="field-label">JWT</span>
          <textarea
            v-model="state.input.value.tokenInput"
            class="text-area jwt-input"
            spellcheck="false"
            placeholder="粘贴完整的 header.payload.signature"
          />
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
        empty-text="保存一次快照后，这里会记录最近的 JWT 解析结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<JwtStudioInput, JwtStudioOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="解析结果" :subtitle="parsed?.error || parsed?.summary || '等待输入 token'">
        <ToolPanel title="状态摘要" subtitle="优先确认 token 当前是否可用，以及时间字段是否合理。">
          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">状态</span>
                <strong class="result-value">{{ statusLabel }}</strong>
              </div>
              <button type="button" class="ghost-button small-button" @click="copyValue(parsed?.signatureText || '', '签名')">
                复制签名
              </button>
            </article>

            <article v-for="row in parsed?.timeRows || []" :key="row.label" class="data-row">
              <div>
                <span class="result-label">{{ row.label }}</span>
                <strong class="result-value">{{ row.value }}</strong>
              </div>
            </article>
          </div>

          <p
            class="helper-text"
            :class="{
              'helper-text-success': statusTone === 'success',
              'helper-text-danger': statusTone === 'danger',
            }"
          >
            {{ parsed?.summary || '等待输入 token' }}
          </p>
        </ToolPanel>

        <ToolPanel title="Claims" subtitle="只展开最常见的前几项，避免信息过载。">
          <div v-if="parsed?.claimRows.length" class="data-list">
            <article v-for="row in parsed.claimRows" :key="row.label" class="data-row">
              <div>
                <span class="result-label">{{ row.label }}</span>
                <strong class="result-value">{{ row.value }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>解析成功后，这里会展示 payload 中的关键字段。</p>
          </div>
        </ToolPanel>

        <ToolPanel title="Header">
          <template #actions>
            <button type="button" class="ghost-button small-button" @click="copyValue(parsed?.headerText || '', 'header')">复制</button>
          </template>

          <textarea :value="parsed?.headerText || ''" class="text-area text-area-compact" readonly placeholder="Header JSON 会显示在这里" />
        </ToolPanel>

        <ToolPanel title="Payload">
          <template #actions>
            <button type="button" class="ghost-button small-button" @click="copyValue(parsed?.payloadText || '', 'payload')">复制</button>
          </template>

          <textarea :value="parsed?.payloadText || ''" class="text-area jwt-output" readonly placeholder="Payload JSON 会显示在这里" />
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
