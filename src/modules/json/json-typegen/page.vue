<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
import { type JsonTypegenConfig } from './logic'
import {
  buildJsonTypegenDownloadPayload,
  buildJsonTypegenHistoryLabel,
  createJsonTypegenInitialInput,
  jsonTypegenRuntimeModule,
  type JsonTypegenInput,
  type JsonTypegenOutput,
  type JsonTypegenOutputTab,
} from './module'

const inputKey = 'magic-box.json-typegen.input'
const stateKey = 'magic-box.json-typegen.state'
const inputDomain = 'tool-history:json-typegen:input'
const stateDomain = 'tool-history:json-typegen:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<JsonTypegenConfig & { tab: JsonTypegenOutputTab }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<Partial<JsonTypegenConfig & { tab: JsonTypegenOutputTab }>>(stateDomain, {}, {
  legacyKeys: [stateKey],
  parseLegacy: (raw) => parseSavedState(raw),
})

const state = useToolState<JsonTypegenInput, JsonTypegenOutput>(jsonTypegenRuntimeModule)
const draft = useToolDraft(jsonTypegenRuntimeModule, state, {
  legacyKeys: [inputDomain, inputKey],
  parseLegacy: (raw, legacyKey) => {
    if (legacyKey === inputDomain || legacyKey === inputKey) {
      return {
        ...createJsonTypegenInitialInput(),
        jsonInput: raw,
      }
    }

    return undefined
  },
})
const history = useToolHistory(jsonTypegenRuntimeModule, state, {
  buildEntryMeta: (input) => ({
    label: buildJsonTypegenHistoryLabel(input),
    description: input.jsonInput.split('\n')[0] || '最近一次类型生成结果',
  }),
})
const { run } = useToolExecution(jsonTypegenRuntimeModule, state)
const samples = useToolSamples(jsonTypegenRuntimeModule, state)
const outputTab = ref<JsonTypegenOutputTab>(savedState.tab || 'typescript')
const download = useToolDownload(jsonTypegenRuntimeModule, state, {
  buildPayload: (input, output) => buildJsonTypegenDownloadPayload(input, output, outputTab.value),
})
const share = useToolShare(jsonTypegenRuntimeModule, state, {
  buildShareState: (input) => ({
    input,
    outputTab: outputTab.value,
  }),
  applySharedState: (sharedState) => {
    state.input.value = sharedState.input
    outputTab.value = sharedState.outputTab ?? 'typescript'
  },
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const defaultInput = createJsonTypegenInitialInput()
if (
  state.input.value.config.rootName === defaultInput.config.rootName &&
  state.input.value.config.tsStyle === defaultInput.config.tsStyle &&
  state.input.value.config.zodStrict === defaultInput.config.zodStrict &&
  state.input.value.config.nullAsOptional === defaultInput.config.nullAsOptional
) {
  state.input.value.config = {
    rootName: savedState.rootName || state.input.value.config.rootName,
    tsStyle: (savedState.tsStyle as JsonTypegenConfig['tsStyle']) || state.input.value.config.tsStyle,
    zodStrict: savedState.zodStrict ?? state.input.value.config.zodStrict,
    nullAsOptional: savedState.nullAsOptional ?? state.input.value.config.nullAsOptional,
  }
}

const restoredSharedState = share.restoreSharedState()

const parsedMessage = computed(() => {
  if (state.loading.value) {
    return '生成中...'
  }

  if (state.error.value) {
    return state.error.value
  }

  return '已解析，可在右侧切换输出并复制。'
})
const typescriptOutput = computed(() => state.output.value?.typescriptOutput ?? '')
const zodOutput = computed(() => state.output.value?.zodOutput ?? '')
const activeOutput = computed(() => (outputTab.value === 'typescript' ? typescriptOutput.value : zodOutput.value))

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

watch(
  [() => state.input.value.config, outputTab],
  () => {
    writeStorage(stateDomain, {
      ...state.input.value.config,
      tab: outputTab.value,
    })
  },
  { deep: true }
)

async function copyValue() {
  const success = await copyToClipboard(activeOutput.value)

  if (success) {
    showSuccessMessage(outputTab.value === 'typescript' ? 'TypeScript 已复制' : 'Zod 已复制')
    return
  }

  showErrorMessage('当前环境不支持复制')
}

function saveSnapshot() {
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

function clearAll() {
  draft.clearDraft()
  state.input.value = {
    ...createJsonTypegenInitialInput(),
    jsonInput: '',
  }
  state.output.value = null
  state.error.value = null
}

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)

  if (!sample) {
    return
  }

  samples.applySample(sample)
  void run()
}

onMounted(() => {
  if (!restoredSharedState && !state.output.value && !state.error.value) {
    void run()
  }
})
</script>

<template>
  <ToolScaffold :meta="jsonTypegenRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="!activeOutput" @click="copyValue">复制输出</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载输出</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="JSON 输入" subtitle="输入 JSON 后自动推断 TypeScript 类型与 Zod schema。" :badge="state.error.value ? '错误' : '已解析'">
        <label class="field-row">
          <span class="field-label">JSON</span>
          <textarea v-model="state.input.value.jsonInput" class="text-area text-area-full" spellcheck="false" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <p class="helper-text" :class="{ 'helper-text-danger': Boolean(state.error.value) }">
          {{ parsedMessage }}
        </p>

        <ToolPanel title="生成配置" subtitle="保留少量高价值开关，避免生成结果过于复杂。">
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">根类型名</span>
              <input v-model="state.input.value.config.rootName" class="text-input" type="text" />
            </label>
            <label class="field-row">
              <span class="field-label">TS 风格</span>
              <select v-model="state.input.value.config.tsStyle" class="select-input">
                <option value="interface">interface</option>
                <option value="type">type</option>
              </select>
            </label>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">Zod strict</span>
              <select v-model="state.input.value.config.zodStrict" class="select-input">
                <option :value="false">关闭</option>
                <option :value="true">开启</option>
              </select>
            </label>
            <label class="field-row">
              <span class="field-label">null 视为可选</span>
              <select v-model="state.input.value.config.nullAsOptional" class="select-input">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </label>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的 JSON Typegen 配置与输入。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<JsonTypegenInput, JsonTypegenOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="输出" subtitle="生成结果为代码片段，可直接复制到项目中。">
        <div class="tab-row">
          <button
            type="button"
            class="tab-button"
            :data-active="outputTab === 'typescript'"
            @click="outputTab = 'typescript'"
          >
            TypeScript
          </button>
          <button type="button" class="tab-button" :data-active="outputTab === 'zod'" @click="outputTab = 'zod'">
            Zod
          </button>
        </div>

        <textarea
          :value="activeOutput"
          class="text-area text-area-full json-typegen-output"
          readonly
          placeholder="输入 JSON 后，这里会生成代码"
        />
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>

<style scoped>
.json-typegen-output {
  min-height: 24rem;
}

@media (min-width: 1200px) {
  .json-typegen-output {
    min-height: 30rem;
  }
}
</style>
