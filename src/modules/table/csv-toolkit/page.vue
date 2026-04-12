<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
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
import type { CsvDelimiter } from './logic'
import {
  buildCsvToolkitDownloadPayload,
  buildCsvToolkitHistoryLabel,
  csvToolkitRuntimeModule,
  type CsvToolkitInput,
  type CsvToolkitOutput,
  type CsvToolkitOutputTab,
  updateCsvDelimiter,
} from './module'

const csvToolkitStateDomain = 'tool-history:csv-toolkit:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      outputTab: CsvToolkitOutputTab
    }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<
  Partial<{
    outputTab: CsvToolkitOutputTab
  }>
>(csvToolkitStateDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const state = useToolState<CsvToolkitInput, CsvToolkitOutput>(csvToolkitRuntimeModule)
const draft = useToolDraft(csvToolkitRuntimeModule, state, {
  legacyKeys: ['magic-box:v1:tool-history:csv-toolkit:state'],
  parseLegacy: (raw) => {
    try {
      const parsed = JSON.parse(raw) as Partial<{
        inputMode: CsvToolkitInput['inputMode']
        inputText: string
        options: CsvToolkitInput['options']
      }>

      if (!parsed.inputText) {
        return undefined
      }

      return {
        inputMode: parsed.inputMode ?? 'csv',
        inputText: parsed.inputText,
        options: {
          delimiter: parsed.options?.delimiter ?? ',',
          hasHeader: parsed.options?.hasHeader ?? true,
          trimCells: parsed.options?.trimCells ?? true,
          removeBlankLines: parsed.options?.removeBlankLines ?? true,
        },
      }
    } catch {
      return undefined
    }
  },
})
const history = useToolHistory(csvToolkitRuntimeModule, state, {
  buildEntryMeta: (input) => ({
    label: buildCsvToolkitHistoryLabel(input),
    description: input.inputText.split('\n')[0] || '最近一次表格转换结果',
  }),
})
const { run, reset } = useToolExecution(csvToolkitRuntimeModule, state)
const download = useToolDownload(csvToolkitRuntimeModule, state, {
  buildPayload: (_, output) => buildCsvToolkitDownloadPayload(output, outputTab.value),
  unavailableMessage: '当前标签页没有可下载的文本结果',
})
const samples = useToolSamples(csvToolkitRuntimeModule, state)
const share = useToolShare(csvToolkitRuntimeModule, state, {
  buildShareState: (input) => ({
    input,
    outputTab: outputTab.value,
  }),
  applySharedState: (sharedState) => {
    state.input.value = sharedState.input
    outputTab.value = sharedState.outputTab ?? 'preview'
  },
})
const { success: showSuccessMessage, error: showErrorMessage, info: showInfoMessage } = useMessage()

const outputTab = ref<CsvToolkitOutputTab>(savedState.outputTab ?? 'preview')
const previewResult = computed(() => state.output.value?.previewResult ?? { ok: false as const, error: '当前没有可预览的数据' })
const jsonOutput = computed(() => state.output.value?.jsonOutput ?? { ok: false as const, error: 'JSON 输出会显示在这里' })
const csvOutput = computed(() => state.output.value?.csvOutput ?? { ok: false as const, error: 'CSV 输出会显示在这里' })
const inputPlaceholder = computed(() =>
  state.input.value.inputMode === 'csv' ? 'name,email\nAlice,alice@example.com' : '[{"name":"Alice"}]'
)

share.restoreSharedState()

watch(outputTab, (value) => {
  writeStorage(csvToolkitStateDomain, {
    outputTab: value,
  })
})

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

async function copyValue(value: string, label: string) {
  const copied = await copyToClipboard(value)

  if (copied) {
    showSuccessMessage(`${label}已复制`)
    return
  }

  showErrorMessage('当前环境不支持复制')
}

function replaceInputWithOutput() {
  if (outputTab.value === 'json' && jsonOutput.value.ok && jsonOutput.value.value) {
    state.input.value.inputMode = 'json'
    state.input.value.inputText = jsonOutput.value.value
    showInfoMessage('已用 JSON 输出覆盖输入')
    return
  }

  if (csvOutput.value.ok && csvOutput.value.value) {
    state.input.value.inputMode = 'csv'
    state.input.value.inputText = csvOutput.value.value
    showInfoMessage('已用 CSV 输出覆盖输入')
  }
}

function clearAll() {
  draft.clearDraft()
  reset()
  state.input.value.inputText = ''
  state.output.value = null
  state.error.value = null
}

function updateDelimiter(delimiter: CsvDelimiter) {
  state.input.value.options = updateCsvDelimiter(state.input.value.options, delimiter)
}

function saveSnapshot() {
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

onMounted(() => {
  void run()
})
</script>

<template>
  <ToolScaffold :meta="csvToolkitRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #input>
      <ToolPaneShell title="输入区" subtitle="支持 CSV / JSON 双向转换，适合快速预览、清洗和导出。">
        <ToolActionBar>
          <button
            type="button"
            class="tab-button"
            :data-active="state.input.value.inputMode === 'csv'"
            @click="state.input.value.inputMode = 'csv'"
          >
            CSV
          </button>
          <button
            type="button"
            class="tab-button"
            :data-active="state.input.value.inputMode === 'json'"
            @click="state.input.value.inputMode = 'json'"
          >
            JSON
          </button>
          <button type="button" class="ghost-button" @click="saveSnapshot">保存快照</button>
          <button type="button" class="ghost-button" @click="replaceInputWithOutput">用输出覆盖输入</button>
          <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载输出</button>
          <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
          <button type="button" class="ghost-button" @click="clearAll">清空</button>
        </ToolActionBar>

        <ToolPanel title="解析选项">
          <div class="csv-option-grid">
            <div class="tab-row">
              <button
                type="button"
                class="tab-button"
                :data-active="state.input.value.options.delimiter === ','"
                @click="updateDelimiter(',')"
              >
                逗号
              </button>
              <button
                type="button"
                class="tab-button"
                :data-active="state.input.value.options.delimiter === ';'"
                @click="updateDelimiter(';')"
              >
                分号
              </button>
              <button
                type="button"
                class="tab-button"
                :data-active="state.input.value.options.delimiter === '\t'"
                @click="updateDelimiter('\t')"
              >
                Tab
              </button>
            </div>

            <label class="text-option-item">
              <input v-model="state.input.value.options.hasHeader" type="checkbox" />
              <span>首行作为表头</span>
            </label>
            <label class="text-option-item">
              <input v-model="state.input.value.options.trimCells" type="checkbox" />
              <span>去除单元格首尾空白</span>
            </label>
            <label class="text-option-item">
              <input v-model="state.input.value.options.removeBlankLines" type="checkbox" />
              <span>过滤空行</span>
            </label>
          </div>
        </ToolPanel>

        <label class="field-row">
          <span class="field-label">原始输入</span>
          <textarea
            v-model="state.input.value.inputText"
            class="text-area text-area-full"
            spellcheck="false"
            :placeholder="inputPlaceholder"
          />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="(sampleId) => samples.applySample(samples.samples.value.find((sample) => sample.id === sampleId)!)"
        />
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的 CSV/JSON 转换状态。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<CsvToolkitInput, CsvToolkitOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="输出区" subtitle="先看表格预览，再按需复制 JSON 或 CSV 结果。">
        <div class="csv-summary-grid">
          <ResultCard
            title="预览摘要"
            :subtitle="previewResult.ok ? '当前输入已成功解析' : '当前输入尚未成功解析'"
            :tone="previewResult.ok ? 'success' : 'danger'"
          >
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">列数</span>
                  <strong class="result-value">{{ previewResult.value?.columnCount ?? 0 }}</strong>
                </div>
                <div>
                  <span class="result-label">数据行</span>
                  <strong class="result-value">{{ previewResult.value?.rowCount ?? 0 }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>

          <ResultCard
            title="复制结果"
            subtitle="CSV 和 JSON 都可以直接继续喂给其他工具"
            :copy-value="outputTab === 'csv' ? csvOutput.value || '' : jsonOutput.value || ''"
          >
            <p class="meta-hint">当前可切换到 JSON 输出继续给接口调试、脚本生成或数据清洗使用。</p>
          </ResultCard>
        </div>

        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="outputTab === 'preview'" @click="outputTab = 'preview'">表格预览</button>
          <button type="button" class="tab-button" :data-active="outputTab === 'json'" @click="outputTab = 'json'">JSON 输出</button>
          <button type="button" class="tab-button" :data-active="outputTab === 'csv'" @click="outputTab = 'csv'">CSV 输出</button>
        </div>

        <ToolPanel v-if="outputTab === 'preview'" title="表格预览">
          <div v-if="previewResult.ok && previewResult.value" class="csv-preview-table-wrap">
            <table class="csv-preview-table">
              <thead>
                <tr>
                  <th v-for="header in previewResult.value.headers" :key="header">{{ header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in previewResult.value.rows.slice(0, 10)" :key="rowIndex">
                  <td v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`">{{ cell || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="previewResult.value.rowCount > 10" class="meta-hint">当前只预览前 10 行，避免长表格撑满页面。</p>
          </div>
          <div v-else class="empty-panel">
            <p>{{ previewResult.error || '当前没有可预览的数据' }}</p>
          </div>
        </ToolPanel>

        <ToolPanel v-else-if="outputTab === 'json'" title="JSON 输出">
          <template #actions>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!jsonOutput.ok || !jsonOutput.value"
              @click="copyValue(jsonOutput.value || '', 'JSON 输出')"
            >
              复制
            </button>
          </template>

          <textarea
            :value="jsonOutput.value || ''"
            class="text-area text-area-full"
            readonly
            :placeholder="jsonOutput.error || 'JSON 输出会显示在这里'"
          />
        </ToolPanel>

        <ToolPanel v-else title="CSV 输出">
          <template #actions>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!csvOutput.ok || !csvOutput.value"
              @click="copyValue(csvOutput.value || '', 'CSV 输出')"
            >
              复制
            </button>
          </template>

          <textarea
            :value="csvOutput.value || ''"
            class="text-area text-area-full"
            readonly
            :placeholder="csvOutput.error || 'CSV 输出会显示在这里'"
          />
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>

<style scoped>
.csv-option-grid,
.csv-summary-grid {
  display: grid;
  gap: 0.875rem;
}

.csv-summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.text-option-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--text);
}

.csv-preview-table-wrap {
  overflow: auto;
}

.csv-preview-table {
  width: 100%;
  border-collapse: collapse;
}

.csv-preview-table th,
.csv-preview-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--surface-card-border);
  text-align: left;
  vertical-align: top;
}

@media (max-width: 900px) {
  .csv-summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
