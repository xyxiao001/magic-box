<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage } from '@/lib/storage'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDownload } from '@/tool-runtime/composables/useToolDownload'
import { useToolDraft } from '@/tool-runtime/composables/useToolDraft'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolHistory } from '@/tool-runtime/composables/useToolHistory'
import { readToolHistory, type ToolHistoryEntry, writeToolHistory } from '@/tool-runtime/services/tool-history-service'
import { useToolSamples } from '@/tool-runtime/composables/useToolSamples'
import { useToolShare } from '@/tool-runtime/composables/useToolShare'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolSamplePanel from '@/tool-runtime/scaffolds/ToolSamplePanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { CalculatorHistoryEntry } from './logic'
import {
  buildCalculatorProDownloadPayload,
  buildCalculatorProHistoryLabel,
  calculatorProRuntimeModule,
  createCalculatorProInitialInput,
  executeCalculatorPro,
  type CalculatorProInput,
  type CalculatorProOutput,
} from './module'

const expressionStorageKey = 'magic-box.calculator.expression'
const historyStorageKey = 'magic-box.calculator.history'
const expressionStorageDomain = 'tool-history:calculator-pro:expression'
const historyStorageDomain = 'tool-history:calculator-pro:history'

function parseHistoryEntries(raw: string) {
  try {
    return JSON.parse(raw) as CalculatorHistoryEntry[]
  } catch {
    return undefined
  }
}

const legacyExpression = readStorage(expressionStorageDomain, createCalculatorProInitialInput().expression, {
  legacyKeys: [expressionStorageKey],
  parseLegacy: (raw) => raw,
})
const legacyHistory = readStorage<CalculatorHistoryEntry[]>(historyStorageDomain, [], {
  legacyKeys: [historyStorageKey],
  parseLegacy: (raw) => parseHistoryEntries(raw),
})

const state = useToolState<CalculatorProInput, CalculatorProOutput>(calculatorProRuntimeModule)
const draft = useToolDraft(calculatorProRuntimeModule, state)
if (state.input.value.expression === createCalculatorProInitialInput().expression) {
  state.input.value.expression = legacyExpression
}

const existingRuntimeHistory = readToolHistory<CalculatorProInput, CalculatorProOutput>('calculator-pro')
if (!existingRuntimeHistory.length && legacyHistory.length) {
  writeToolHistory(
    'calculator-pro',
    legacyHistory.map((entry, index) => ({
      id: `legacy_${index}_${Date.now()}`,
      createdAt: new Date().toISOString(),
      label: `结果 ${entry.result}`,
      description: entry.expression,
      input: { ...createCalculatorProInitialInput(), expression: entry.expression },
      output: {
        ...executeCalculatorPro({ ...createCalculatorProInitialInput(), expression: entry.expression }),
      } as CalculatorProOutput,
    }))
  )
}

const history = useToolHistory(calculatorProRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildCalculatorProHistoryLabel(output) : 'Calculator 快照',
    description: output?.expressionResult || output?.expressionError || '',
  }),
})
const { run } = useToolExecution(calculatorProRuntimeModule, state)
const samples = useToolSamples(calculatorProRuntimeModule, state)
const download = useToolDownload(calculatorProRuntimeModule, state, {
  buildPayload: (_, output) => buildCalculatorProDownloadPayload(output),
})
const share = useToolShare(calculatorProRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const restoredSharedState = share.restoreSharedState()
const output = computed(() => state.output.value)

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

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  if (success) {
    showSuccessMessage(`${label}已复制`)
    return
  }
  showErrorMessage('当前环境不支持复制')
}

function saveSnapshot() {
  if (!state.output.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

function useHistoryEntry(entry: ToolHistoryEntry<CalculatorProInput, CalculatorProOutput>) {
  history.restoreEntry(entry)
}

function clearAll() {
  draft.clearDraft()
  state.input.value = createCalculatorProInitialInput()
  state.input.value.expression = ''
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
  <ToolScaffold :meta="calculatorProRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="copyValue(output?.expressionError || output?.expressionResult || '', '结果')">复制结果</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="表达式计算" subtitle="支持四则运算、括号和百分比写法，例如 200 * 15%。">
        <label class="field-row">
          <span class="field-label">表达式</span>
          <textarea v-model="state.input.value.expression" class="text-area text-area-full" spellcheck="false" placeholder="输入表达式，例如：(120 + 30) * 0.85" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <ToolPanel title="结果">
          <div class="calculator-result-card">
            <strong class="calculator-result-value">{{ output?.expressionError || output?.expressionResult || '—' }}</strong>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的表达式结果。"
        @restore="(entry) => useHistoryEntry(entry as ToolHistoryEntry<CalculatorProInput, CalculatorProOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="快捷模式" subtitle="首版先覆盖折扣、税率和均摊三类最常见计算场景。">
        <ToolPanel title="折扣">
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">原价</span>
              <input v-model.number="state.input.value.discountPrice" class="text-input" type="number" min="0" />
            </label>
            <label class="field-row">
              <span class="field-label">折扣%</span>
              <input v-model.number="state.input.value.discountPercent" class="text-input" type="number" min="0" max="100" />
            </label>
          </div>
          <div class="data-list">
            <article v-for="entry in output?.discountResults || []" :key="entry.label" class="data-row">
              <div>
                <span class="result-label">{{ entry.label }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
              </div>
            </article>
          </div>
        </ToolPanel>

        <ToolPanel title="税率">
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">金额</span>
              <input v-model.number="state.input.value.taxAmount" class="text-input" type="number" min="0" />
            </label>
            <label class="field-row">
              <span class="field-label">税率%</span>
              <input v-model.number="state.input.value.taxPercent" class="text-input" type="number" min="0" />
            </label>
          </div>
          <div class="data-list">
            <article v-for="entry in output?.taxResults || []" :key="entry.label" class="data-row">
              <div>
                <span class="result-label">{{ entry.label }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
              </div>
            </article>
          </div>
        </ToolPanel>

        <ToolPanel title="均摊">
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">总额</span>
              <input v-model.number="state.input.value.splitTotal" class="text-input" type="number" min="0" />
            </label>
            <label class="field-row">
              <span class="field-label">人数</span>
              <input v-model.number="state.input.value.splitPeople" class="text-input" type="number" min="1" />
            </label>
          </div>
          <div class="data-list">
            <article v-for="entry in output?.splitResults || []" :key="entry.label" class="data-row">
              <div>
                <span class="result-label">{{ entry.label }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
              </div>
            </article>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
