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
  buildJwtSignVerifyDownloadPayload,
  buildJwtSignVerifyHistoryLabel,
  createJwtSignVerifyInitialInput,
  executeJwtSignVerify,
  jwtSignVerifyRuntimeModule,
  type JwtSignVerifyInput,
  type JwtSignVerifyOutput,
} from './module'

const legacyDomain = 'tool-history:jwt-sign-verify:state'
const secretDomain = 'tool-history:jwt-sign-verify:secret-state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      mode: 'sign' | 'verify'
      secret: string
      persistSecret: boolean
      headerInput: string
      payloadInput: string
      tokenInput: string
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
  ...jwtSignVerifyRuntimeModule,
  execute: (input: JwtSignVerifyInput) => executeJwtSignVerify(input, { secret: secret.value }),
}

const state = useToolState<JwtSignVerifyInput, JwtSignVerifyOutput>(runtimeModule)
const draft = useToolDraft(runtimeModule, state)
if (legacyState) {
  const initial = createJwtSignVerifyInitialInput()
  if (
    state.input.value.mode === initial.mode &&
    state.input.value.headerInput === initial.headerInput &&
    state.input.value.payloadInput === initial.payloadInput &&
    state.input.value.tokenInput === initial.tokenInput
  ) {
    state.input.value = {
      mode: legacyState.mode ?? state.input.value.mode,
      headerInput: legacyState.headerInput ?? state.input.value.headerInput,
      payloadInput: legacyState.payloadInput ?? state.input.value.payloadInput,
      tokenInput: legacyState.tokenInput ?? state.input.value.tokenInput,
    }
  }
}

const history = useToolHistory(runtimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildJwtSignVerifyHistoryLabel(output) : 'JWT Sign / Verify',
    description:
      output?.mode === 'sign'
        ? output.signResult?.token?.slice(0, 32) ?? ''
        : output?.verifyResult?.verified
          ? '验签通过'
          : '验签失败',
  }),
})
const { run } = useToolExecution(runtimeModule, state)
const samples = useToolSamples(runtimeModule, state)
const download = useToolDownload(runtimeModule, state, {
  buildPayload: (_, output) => buildJwtSignVerifyDownloadPayload(output),
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

const restoredSharedState = share.restoreSharedState()
const output = computed(() => state.output.value)
const activeToken = computed(() => {
  if (output.value?.mode === 'sign') {
    return output.value.signResult?.token ?? ''
  }

  return state.input.value.tokenInput
})

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  if (success) {
    showSuccessMessage(`${label}已复制`)
    return
  }
  showErrorMessage('当前环境不支持复制')
}

async function handleRun() {
  if (!secret.value.trim()) {
    showErrorMessage('请输入 secret')
    return
  }

  await run()
}

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
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
  state.input.value = createJwtSignVerifyInitialInput()
  state.output.value = null
  state.error.value = null
}

onMounted(() => {
  if (!restoredSharedState && persistSecret.value && secret.value.trim()) {
    void run()
  }
})
</script>

<template>
  <ToolScaffold :meta="runtimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="handleRun">{{ state.input.value.mode === 'sign' ? '签发 JWT' : '验签 JWT' }}</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="输入" subtitle="Secret 只保留在当前页面态，不会进入分享链接和历史快照。">
        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="state.input.value.mode === 'sign'" @click="state.input.value.mode = 'sign'">签发</button>
          <button type="button" class="tab-button" :data-active="state.input.value.mode === 'verify'" @click="state.input.value.mode = 'verify'">验签</button>
        </div>

        <label class="field-row">
          <span class="field-label">Secret</span>
          <input v-model="secret" class="text-input" type="password" placeholder="输入 HS256 secret" />
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

        <template v-if="state.input.value.mode === 'sign'">
          <label class="field-row">
            <span class="field-label">Header JSON</span>
            <textarea v-model="state.input.value.headerInput" class="text-area text-area-compact" spellcheck="false" />
          </label>

          <label class="field-row">
            <span class="field-label">Payload JSON</span>
            <textarea v-model="state.input.value.payloadInput" class="text-area text-area-full" spellcheck="false" />
          </label>
        </template>

        <label v-else class="field-row">
          <span class="field-label">JWT</span>
          <textarea v-model="state.input.value.tokenInput" class="text-area text-area-full" spellcheck="false" />
        </label>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的签发或验签结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<JwtSignVerifyInput, JwtSignVerifyOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell
        title="结果"
        :subtitle="output?.mode === 'verify' ? (output.verifyResult?.verified ? '验签通过' : '验签失败') : (output?.signResult?.signature || '等待执行')"
      >
        <ToolPanel title="Token / Signature">
          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">Token</span>
                <strong class="result-value">{{ activeToken || '—' }}</strong>
              </div>
              <button type="button" class="ghost-button small-button" :disabled="!activeToken" @click="copyValue(activeToken, 'Token')">复制</button>
            </article>

            <article class="data-row">
              <div>
                <span class="result-label">Signature</span>
                <strong class="result-value">{{ output?.signResult?.signature || output?.verifyResult?.signature || '—' }}</strong>
              </div>
            </article>
          </div>
        </ToolPanel>

        <ToolPanel title="Header">
          <textarea :value="output?.parsedToken.headerText || ''" class="text-area text-area-compact" readonly />
        </ToolPanel>

        <ToolPanel title="Payload">
          <textarea :value="output?.parsedToken.payloadText || ''" class="text-area text-area-full" readonly />
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
