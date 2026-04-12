<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { buildLineDiff } from '@/lib/diff'
import {
  buildJsonStructuredDiff,
  executeJsonPathQuery,
  formatJsonPathResultValue,
  parseJsonDocument,
} from '@/lib/json-diff-jsonpath'
import { formatJson } from '@/lib/json-tool'
import { readStorage, writeStorage } from '@/lib/storage'

type OutputTab = 'structured' | 'text' | 'jsonpath'
type QuerySource = 'left' | 'right'

interface JsonDiffTemplate {
  label: string
  summary: string
  left: string
  right: string
  query: string
}

const jsonDiffStateDomain = 'tool-history:json-diff-jsonpath:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      left: string
      right: string
      outputTab: OutputTab
      queryExpression: string
      querySource: QuerySource
    }>
  } catch {
    return undefined
  }
}

const templates: JsonDiffTemplate[] = [
  {
    label: '接口响应',
    summary: '适合联调前后响应结构变化对比。',
    left: `{
  "requestId": "req_1001",
  "user": {
    "id": 1,
    "name": "Alice"
  },
  "items": [
    {
      "id": "tool_1",
      "status": "draft"
    }
  ]
}`,
    right: `{
  "requestId": "req_1002",
  "user": {
    "id": 1,
    "name": "Alice",
    "role": "admin"
  },
  "items": [
    {
      "id": "tool_1",
      "status": "published"
    },
    {
      "id": "tool_2",
      "status": "draft"
    }
  ]
}`,
    query: '$.items[*].id',
  },
  {
    label: '功能开关',
    summary: '适合查看配置漂移和字段增删。',
    left: `{
  "theme": "dark",
  "features": {
    "jsonDiff": false,
    "markdown": true
  }
}`,
    right: `{
  "theme": "dark",
  "features": {
    "jsonDiff": true,
    "markdown": true,
    "sqlFormatter": true
  }
}`,
    query: '$.features.*',
  },
]

const savedState = readStorage<
  Partial<{
    left: string
    right: string
    outputTab: OutputTab
    queryExpression: string
    querySource: QuerySource
  }>
>(jsonDiffStateDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const leftInput = ref(savedState.left ?? templates[0]?.left ?? '')
const rightInput = ref(savedState.right ?? templates[0]?.right ?? '')
const outputTab = ref<OutputTab>(savedState.outputTab ?? 'structured')
const queryExpression = ref(savedState.queryExpression ?? templates[0]?.query ?? '$')
const querySource = ref<QuerySource>(savedState.querySource ?? 'right')
const toastMessage = ref('')

const leftParsed = computed(() => parseJsonDocument(leftInput.value))
const rightParsed = computed(() => parseJsonDocument(rightInput.value))
const canDiff = computed(() => leftParsed.value.ok && rightParsed.value.ok)
const formattedLeft = computed(() => {
  const result = formatJson(leftInput.value)
  return result.ok && result.value ? result.value : leftInput.value
})
const formattedRight = computed(() => {
  const result = formatJson(rightInput.value)
  return result.ok && result.value ? result.value : rightInput.value
})
const textDiff = computed(() => buildLineDiff(formattedLeft.value, formattedRight.value))
const structuredDiff = computed(() =>
  canDiff.value ? buildJsonStructuredDiff(leftParsed.value.value, rightParsed.value.value) : null
)
const activeQueryInput = computed(() => (querySource.value === 'left' ? leftParsed.value : rightParsed.value))
const jsonPathResult = computed(() => {
  if (!queryExpression.value.trim()) {
    return {
      ok: false,
      error: '请输入 JSONPath 表达式',
    }
  }

  if (!activeQueryInput.value.ok) {
    return {
      ok: false,
      error: `当前${querySource.value === 'left' ? '左侧' : '右侧'} JSON 不合法，无法执行查询`,
    }
  }

  return executeJsonPathQuery(activeQueryInput.value.value, queryExpression.value)
})
const queryMatchesText = computed(() => {
  if (!jsonPathResult.value.ok || !jsonPathResult.value.value) {
    return ''
  }

  return jsonPathResult.value.value
    .map((item) => `${item.path}\n${formatJsonPathResultValue(item.value)}`)
    .join('\n\n')
})

watch(
  [leftInput, rightInput, outputTab, queryExpression, querySource],
  () => {
    writeStorage(jsonDiffStateDomain, {
      left: leftInput.value,
      right: rightInput.value,
      outputTab: outputTab.value,
      queryExpression: queryExpression.value,
      querySource: querySource.value,
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

function applyTemplate(template: JsonDiffTemplate) {
  leftInput.value = template.left
  rightInput.value = template.right
  queryExpression.value = template.query
}

function formatOneSide(side: QuerySource) {
  const target = side === 'left' ? leftInput : rightInput
  const result = formatJson(target.value)

  if (result.ok && result.value) {
    target.value = result.value
  }
}

function swapInputs() {
  const currentLeft = leftInput.value
  leftInput.value = rightInput.value
  rightInput.value = currentLeft
}

function clearAll() {
  leftInput.value = ''
  rightInput.value = ''
  queryExpression.value = '$'
}
</script>

<template>
  <ToolPageLayout wide class="json-diff-page">
    <template #editor>
      <ToolPaneShell title="JSON 输入" subtitle="把接口响应或配置对象放到左右两侧，直接做结构差异和路径提取。">
        <ToolActionBar>
          <button type="button" class="solid-button" @click="formatOneSide('left')">格式化左侧</button>
          <button type="button" class="ghost-button" @click="formatOneSide('right')">格式化右侧</button>
          <button type="button" class="ghost-button" @click="swapInputs">左右互换</button>
          <button type="button" class="ghost-button" @click="clearAll">清空</button>
        </ToolActionBar>

        <ToolPanel title="模板">
          <div class="json-diff-template-list">
            <button
              v-for="template in templates"
              :key="template.label"
              type="button"
              class="json-diff-template-card"
              @click="applyTemplate(template)"
            >
              <div class="json-diff-template-top">
                <strong>{{ template.label }}</strong>
                <span class="json-diff-template-action">使用模板</span>
              </div>
              <p>{{ template.summary }}</p>
            </button>
          </div>
        </ToolPanel>

        <div class="json-diff-editor-grid">
          <label class="field-row">
            <span class="field-label">左侧 JSON</span>
            <textarea v-model="leftInput" class="text-area text-area-full" spellcheck="false" placeholder='{"name":"left"}' />
            <span class="meta-hint" :class="{ 'helper-text-danger': !leftParsed.ok }">
              {{ leftParsed.ok ? '左侧 JSON 有效' : leftParsed.error }}
            </span>
          </label>

          <label class="field-row">
            <span class="field-label">右侧 JSON</span>
            <textarea v-model="rightInput" class="text-area text-area-full" spellcheck="false" placeholder='{"name":"right"}' />
            <span class="meta-hint" :class="{ 'helper-text-danger': !rightParsed.ok }">
              {{ rightParsed.ok ? '右侧 JSON 有效' : rightParsed.error }}
            </span>
          </label>
        </div>
      </ToolPaneShell>
    </template>

    <template #viewer>
      <ToolPaneShell title="结果" subtitle="先看结构差异，再按需切换文本对比和 JSONPath 查询。">
        <div class="json-diff-summary-grid">
          <ResultCard
            title="结构差异"
            :subtitle="canDiff ? '只统计结构层面的新增、删除和修改' : '需要左右两侧都是合法 JSON'"
            :tone="canDiff ? 'success' : 'danger'"
          >
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">新增</span>
                  <strong class="result-value">{{ structuredDiff?.stats.added ?? 0 }}</strong>
                </div>
                <div>
                  <span class="result-label">删除</span>
                  <strong class="result-value">{{ structuredDiff?.stats.removed ?? 0 }}</strong>
                </div>
              </article>
              <article class="data-row">
                <div>
                  <span class="result-label">修改</span>
                  <strong class="result-value">{{ structuredDiff?.stats.changed ?? 0 }}</strong>
                </div>
                <div>
                  <span class="result-label">未变化</span>
                  <strong class="result-value">{{ structuredDiff?.stats.unchanged ?? 0 }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>

          <ResultCard
            title="联动建议"
            subtitle="这三个工具连起来用时最顺"
            copy-label="复制查询结果"
            :copy-value="queryMatchesText"
          >
            <div class="json-diff-link-list">
              <router-link class="json-diff-link-card" to="/tools/http-lab">
                <strong>HTTP Lab</strong>
                <p>拿到响应后直接对比接口版本差异。</p>
              </router-link>
              <router-link class="json-diff-link-card" to="/tools/json-toolkit">
                <strong>JSON Toolkit</strong>
                <p>先校验和格式化，再回来做 diff 和 JSONPath。</p>
              </router-link>
              <router-link class="json-diff-link-card" to="/tools/diff-studio">
                <strong>Diff Studio</strong>
                <p>想看原始文本变更时切回逐行 diff 继续排查。</p>
              </router-link>
            </div>
          </ResultCard>
        </div>

        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="outputTab === 'structured'" @click="outputTab = 'structured'">
            结构差异
          </button>
          <button type="button" class="tab-button" :data-active="outputTab === 'text'" @click="outputTab = 'text'">
            文本对比
          </button>
          <button type="button" class="tab-button" :data-active="outputTab === 'jsonpath'" @click="outputTab = 'jsonpath'">
            JSONPath
          </button>
        </div>

        <ToolPanel
          v-if="outputTab === 'structured'"
          title="结构化差异"
          :subtitle="canDiff ? '按 JSON 路径列出新增、删除、修改和未变化项。' : '当前无法生成结构差异'"
        >
          <div v-if="structuredDiff?.entries.length" class="json-diff-entry-list">
            <article v-for="entry in structuredDiff.entries" :key="`${entry.kind}-${entry.path}`" class="json-diff-entry" :data-kind="entry.kind">
              <div>
                <span class="result-label">{{ entry.kind }}</span>
                <strong class="result-value">{{ entry.path }}</strong>
              </div>
              <div class="json-diff-entry-values">
                <code>{{ entry.leftValue }}</code>
                <code>{{ entry.rightValue }}</code>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>左右两侧都是合法 JSON 后，这里会显示结构差异摘要。</p>
          </div>
        </ToolPanel>

        <ToolPanel
          v-else-if="outputTab === 'text'"
          title="文本对比"
          subtitle="基于格式化后的 JSON 做逐行比较，适合快速查看原始文本变化。"
        >
          <div v-if="textDiff.rows.length" class="diff-grid">
            <article
              v-for="(row, index) in textDiff.rows"
              :key="`${row.type}-${index}`"
              class="diff-row"
              :data-type="row.type"
            >
              <div class="diff-cell">
                <span class="diff-line-number">{{ row.leftLineNumber ?? '—' }}</span>
                <code class="diff-code">{{ row.leftText || ' ' }}</code>
              </div>
              <div class="diff-cell">
                <span class="diff-line-number">{{ row.rightLineNumber ?? '—' }}</span>
                <code class="diff-code">{{ row.rightText || ' ' }}</code>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>输入内容后，这里会显示逐行对比结果。</p>
          </div>
        </ToolPanel>

        <ToolPanel
          v-else
          title="JSONPath 查询"
          subtitle="支持 $.a.b、[0]、[*]、['key'] 这类首版高频表达式。"
        >
          <div class="jsonpath-toolbar">
            <label class="field-row">
              <span class="field-label">查询表达式</span>
              <input v-model="queryExpression" class="text-input" type="text" placeholder="$.items[*].id" />
            </label>

            <div class="tab-row">
              <button type="button" class="tab-button" :data-active="querySource === 'left'" @click="querySource = 'left'">
                左侧
              </button>
              <button type="button" class="tab-button" :data-active="querySource === 'right'" @click="querySource = 'right'">
                右侧
              </button>
            </div>
          </div>

          <ToolActionBar>
            <button type="button" class="ghost-button" :disabled="!queryMatchesText" @click="copyValue(queryMatchesText, 'JSONPath 结果')">
              复制结果
            </button>
          </ToolActionBar>

          <div v-if="jsonPathResult.ok && jsonPathResult.value?.length" class="jsonpath-result-list">
            <article v-for="item in jsonPathResult.value" :key="item.path" class="jsonpath-result-card">
              <div class="result-panel-header">
                <span class="result-panel-title">{{ item.path }}</span>
              </div>
              <pre>{{ formatJsonPathResultValue(item.value) }}</pre>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>{{ jsonPathResult.error || '当前表达式没有匹配结果' }}</p>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolPageLayout>

  <section>
    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>

<style scoped>
.json-diff-editor-grid,
.json-diff-template-list,
.json-diff-summary-grid,
.json-diff-link-list {
  display: grid;
  gap: 0.875rem;
}

.json-diff-editor-grid,
.json-diff-summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.json-diff-template-card,
.json-diff-link-card,
.jsonpath-result-card,
.json-diff-entry {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--surface-card-border);
  background: var(--surface-card-bg);
  color: var(--text);
}

.json-diff-template-card,
.json-diff-link-card {
  text-align: left;
}

.json-diff-template-card p,
.json-diff-link-card p {
  margin: 0;
  color: var(--muted);
}

.json-diff-template-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.json-diff-template-action {
  color: var(--accent);
  font-size: 0.875rem;
}

.json-diff-link-card {
  text-decoration: none;
}

.json-diff-entry-list,
.jsonpath-result-list {
  display: grid;
  gap: 0.75rem;
}

.json-diff-entry[data-kind='added'] {
  border-color: rgba(74, 222, 128, 0.25);
}

.json-diff-entry[data-kind='removed'] {
  border-color: rgba(248, 113, 113, 0.24);
}

.json-diff-entry[data-kind='changed'] {
  border-color: rgba(96, 165, 250, 0.26);
}

.json-diff-entry-values {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.json-diff-entry-values code,
.jsonpath-result-card pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.jsonpath-toolbar {
  display: grid;
  gap: 0.875rem;
}

@media (max-width: 900px) {
  .json-diff-editor-grid,
  .json-diff-summary-grid,
  .json-diff-entry-values {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
