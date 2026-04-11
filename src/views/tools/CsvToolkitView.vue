<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  convertCsvToJson,
  convertJsonArrayToCsv,
  defaultCsvToolkitOptions,
  parseCsvInput,
  type CsvDelimiter,
  type CsvToolkitOptions,
} from '@/lib/csv-toolkit'
import { readStorage, writeStorage } from '@/lib/storage'

type InputMode = 'csv' | 'json'
type OutputTab = 'preview' | 'json' | 'csv'

interface CsvTemplate {
  label: string
  summary: string
  inputMode: InputMode
  input: string
}

const csvToolkitStateDomain = 'tool-history:csv-toolkit:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      inputMode: InputMode
      inputText: string
      outputTab: OutputTab
      options: CsvToolkitOptions
    }>
  } catch {
    return undefined
  }
}

const templates: CsvTemplate[] = [
  {
    label: '用户列表',
    summary: '适合把简单表格快速转成 JSON 数组。',
    inputMode: 'csv',
    input: `name,email,role
Alice,alice@example.com,admin
Bob,bob@example.com,editor`,
  },
  {
    label: '商品列表',
    summary: '适合运营或测试整理价格、库存、状态列。',
    inputMode: 'csv',
    input: `sku;title;price;stock
SKU-001;Magic Box Pro;199;42
SKU-002;Magic Box Lite;99;18`,
  },
  {
    label: 'JSON 数组',
    summary: '适合把接口结构快速导出成 CSV。',
    inputMode: 'json',
    input: `[
  {
    "id": "user_1",
    "name": "Alice",
    "role": "admin"
  },
  {
    "id": "user_2",
    "name": "Bob",
    "role": "editor"
  }
]`,
  },
]

const savedState = readStorage<
  Partial<{
    inputMode: InputMode
    inputText: string
    outputTab: OutputTab
    options: CsvToolkitOptions
  }>
>(csvToolkitStateDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const inputMode = ref<InputMode>(savedState.inputMode ?? 'csv')
const inputText = ref(savedState.inputText ?? templates[0]?.input ?? '')
const outputTab = ref<OutputTab>(savedState.outputTab ?? 'preview')
const options = ref<CsvToolkitOptions>({
  ...defaultCsvToolkitOptions,
  ...savedState.options,
})
const toastMessage = ref('')

const previewResult = computed(() =>
  inputMode.value === 'csv'
    ? parseCsvInput(inputText.value, options.value)
    : (() => {
        const csvResult = convertJsonArrayToCsv(inputText.value, options.value.delimiter)

        if (!csvResult.ok || !csvResult.value) {
          return {
            ok: false as const,
            error: csvResult.error,
          }
        }

        return parseCsvInput(csvResult.value, options.value)
      })()
)
const jsonOutput = computed(() => {
  if (inputMode.value === 'csv') {
    return convertCsvToJson(inputText.value, options.value)
  }

  return {
    ok: true as const,
    value: inputText.value,
  }
})
const csvOutput = computed(() => {
  if (inputMode.value === 'json') {
    return convertJsonArrayToCsv(inputText.value, options.value.delimiter)
  }

  return {
    ok: true as const,
    value: inputText.value,
  }
})
const inputPlaceholder = computed(() =>
  inputMode.value === 'csv' ? 'name,email\nAlice,alice@example.com' : '[{"name":"Alice"}]'
)

watch(
  [inputMode, inputText, outputTab, options],
  () => {
    writeStorage(csvToolkitStateDomain, {
      inputMode: inputMode.value,
      inputText: inputText.value,
      outputTab: outputTab.value,
      options: options.value,
    })
  },
  { deep: true }
)

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  toastMessage.value = success ? `${label}已复制` : '当前环境不支持复制'

  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

function applyTemplate(template: CsvTemplate) {
  inputMode.value = template.inputMode
  inputText.value = template.input

  if (template.label === '商品列表') {
    options.value = {
      ...options.value,
      delimiter: ';',
    }
    return
  }

  options.value = {
    ...options.value,
    delimiter: ',',
  }
}

function replaceInputWithOutput() {
  if (outputTab.value === 'json' && jsonOutput.value.ok && jsonOutput.value.value) {
    inputMode.value = 'json'
    inputText.value = jsonOutput.value.value
    return
  }

  if (csvOutput.value.ok && csvOutput.value.value) {
    inputMode.value = 'csv'
    inputText.value = csvOutput.value.value
  }
}

function clearAll() {
  inputText.value = ''
}

function updateDelimiter(delimiter: CsvDelimiter) {
  options.value = {
    ...options.value,
    delimiter,
  }
}
</script>

<template>
  <ToolPageLayout wide class="csv-toolkit-page">
    <template #editor>
      <ToolPanel title="输入区" subtitle="支持 CSV / JSON 双向转换，适合快速预览、清洗和导出。">
        <ToolActionBar>
          <button type="button" class="tab-button" :data-active="inputMode === 'csv'" @click="inputMode = 'csv'">CSV</button>
          <button type="button" class="tab-button" :data-active="inputMode === 'json'" @click="inputMode = 'json'">JSON</button>
          <button type="button" class="ghost-button" @click="replaceInputWithOutput">用输出覆盖输入</button>
          <button type="button" class="ghost-button" @click="clearAll">清空</button>
        </ToolActionBar>

        <ToolPanel title="解析选项">
          <div class="csv-option-grid">
            <div class="tab-row">
              <button
                type="button"
                class="tab-button"
                :data-active="options.delimiter === ','"
                @click="updateDelimiter(',')"
              >
                逗号
              </button>
              <button
                type="button"
                class="tab-button"
                :data-active="options.delimiter === ';'"
                @click="updateDelimiter(';')"
              >
                分号
              </button>
              <button
                type="button"
                class="tab-button"
                :data-active="options.delimiter === '\t'"
                @click="updateDelimiter('\t')"
              >
                Tab
              </button>
            </div>

            <label class="text-option-item">
              <input v-model="options.hasHeader" type="checkbox" />
              <span>首行作为表头</span>
            </label>
            <label class="text-option-item">
              <input v-model="options.trimCells" type="checkbox" />
              <span>去除单元格首尾空白</span>
            </label>
            <label class="text-option-item">
              <input v-model="options.removeBlankLines" type="checkbox" />
              <span>过滤空行</span>
            </label>
          </div>
        </ToolPanel>

        <ToolPanel title="模板">
          <div class="csv-template-list">
            <button v-for="template in templates" :key="template.label" type="button" class="csv-template-card" @click="applyTemplate(template)">
              <div class="csv-template-top">
                <strong>{{ template.label }}</strong>
                <span class="csv-template-action">使用模板</span>
              </div>
              <p>{{ template.summary }}</p>
            </button>
          </div>
        </ToolPanel>

        <label class="field-row">
          <span class="field-label">原始输入</span>
          <textarea
            v-model="inputText"
            class="text-area text-area-full"
            spellcheck="false"
            :placeholder="inputPlaceholder"
          />
        </label>
      </ToolPanel>
    </template>

    <template #viewer>
      <ToolPanel title="输出区" subtitle="先看表格预览，再按需复制 JSON 或 CSV 结果。">
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
      </ToolPanel>
    </template>
  </ToolPageLayout>

  <section>
    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>

<style scoped>
.csv-option-grid,
.csv-template-list,
.csv-summary-grid {
  display: grid;
  gap: 0.875rem;
}

.csv-summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.csv-template-card {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--surface-card-border);
  background: var(--surface-card-bg);
  text-align: left;
  color: var(--text);
}

.csv-template-card p {
  margin: 0;
  color: var(--muted);
}

.csv-template-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.csv-template-action {
  color: var(--accent);
  font-size: 0.875rem;
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
