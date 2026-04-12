<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
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
import { useToolSamples } from '@/tool-runtime/composables/useToolSamples'
import { useToolShare } from '@/tool-runtime/composables/useToolShare'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolSamplePanel from '@/tool-runtime/scaffolds/ToolSamplePanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import { formatJsonPathResultValue, formatJson } from './logic'
import {
  buildJsonDiffJsonPathDownloadPayload,
  buildJsonDiffJsonPathHistoryLabel,
  createJsonDiffJsonPathInitialInput,
  jsonDiffJsonPathRuntimeModule,
  type JsonDiffJsonPathInput,
  type JsonDiffJsonPathOutput,
  type JsonDiffOutputTab,
  type JsonDiffQuerySource,
} from './module'

const jsonDiffStateDomain = 'tool-history:json-diff-jsonpath:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      leftInput: string
      rightInput: string
      outputTab: JsonDiffOutputTab
      queryExpression: string
      querySource: JsonDiffQuerySource
    }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<
  Partial<{
    leftInput: string
    rightInput: string
    outputTab: JsonDiffOutputTab
    queryExpression: string
    querySource: JsonDiffQuerySource
  }>
>(jsonDiffStateDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const state = useToolState<JsonDiffJsonPathInput, JsonDiffJsonPathOutput>(jsonDiffJsonPathRuntimeModule)
const draft = useToolDraft(jsonDiffJsonPathRuntimeModule, state)
const history = useToolHistory(jsonDiffJsonPathRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildJsonDiffJsonPathHistoryLabel(output) : 'JSON 差异',
    description: output?.queryMatchesText.split('\n')[0] || '最近一次差异与查询结果',
  }),
})
const { run } = useToolExecution(jsonDiffJsonPathRuntimeModule, state)
const samples = useToolSamples(jsonDiffJsonPathRuntimeModule, state)
const outputTab = ref<JsonDiffOutputTab>(savedState.outputTab ?? 'structured')
const download = useToolDownload(jsonDiffJsonPathRuntimeModule, state, {
  buildPayload: (_, output) => buildJsonDiffJsonPathDownloadPayload(output, outputTab.value),
  unavailableMessage: '当前标签页没有可下载的结果',
})
const share = useToolShare(jsonDiffJsonPathRuntimeModule, state, {
  buildShareState: (input) => ({
    input,
    outputTab: outputTab.value,
  }),
  applySharedState: (sharedState) => {
    state.input.value = sharedState.input
    outputTab.value = sharedState.outputTab ?? 'structured'
  },
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const defaultInput = createJsonDiffJsonPathInitialInput()
if (
  state.input.value.leftInput === defaultInput.leftInput &&
  state.input.value.rightInput === defaultInput.rightInput &&
  state.input.value.queryExpression === defaultInput.queryExpression &&
  state.input.value.querySource === defaultInput.querySource
) {
  state.input.value = {
    ...state.input.value,
    leftInput: savedState.leftInput ?? state.input.value.leftInput,
    rightInput: savedState.rightInput ?? state.input.value.rightInput,
    queryExpression: savedState.queryExpression ?? state.input.value.queryExpression,
    querySource: savedState.querySource ?? state.input.value.querySource,
  }
}

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

  if (!sample) {
    return
  }

  samples.applySample(sample)
  void run()
}

function formatOneSide(side: JsonDiffQuerySource) {
  const result = formatJson(side === 'left' ? state.input.value.leftInput : state.input.value.rightInput)

  if (!result.ok || !result.value) {
    return
  }

  if (side === 'left') {
    state.input.value.leftInput = result.value
    return
  }

  state.input.value.rightInput = result.value
}

function swapInputs() {
  const currentLeft = state.input.value.leftInput
  state.input.value.leftInput = state.input.value.rightInput
  state.input.value.rightInput = currentLeft
}

function clearAll() {
  draft.clearDraft()
  state.input.value = {
    ...createJsonDiffJsonPathInitialInput(),
    leftInput: '',
    rightInput: '',
    queryExpression: '$',
  }
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

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)

  if (success) {
    showSuccessMessage(`${label}已复制`)
    return
  }

  showErrorMessage('当前环境不支持复制')
}

onMounted(() => {
  if (!restoredSharedState) {
    void run()
  }
})
</script>

<template>
  <ToolScaffold :meta="jsonDiffJsonPathRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="formatOneSide('left')">格式化左侧</button>
        <button type="button" class="ghost-button" @click="formatOneSide('right')">格式化右侧</button>
        <button type="button" class="ghost-button" @click="swapInputs">左右互换</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="JSON 输入" subtitle="把接口响应或配置对象放到左右两侧，直接做结构差异和路径提取。">
        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <div class="json-diff-editor-grid">
          <label class="field-row">
            <span class="field-label">左侧 JSON</span>
            <textarea v-model="state.input.value.leftInput" class="text-area text-area-full" spellcheck="false" placeholder='{"name":"left"}' />
            <span class="meta-hint" :class="{ 'helper-text-danger': !output?.leftParsedOk }">
              {{ output?.leftParsedOk ? '左侧 JSON 有效' : output?.leftError || '等待输入' }}
            </span>
          </label>

          <label class="field-row">
            <span class="field-label">右侧 JSON</span>
            <textarea v-model="state.input.value.rightInput" class="text-area text-area-full" spellcheck="false" placeholder='{"name":"right"}' />
            <span class="meta-hint" :class="{ 'helper-text-danger': !output?.rightParsedOk }">
              {{ output?.rightParsedOk ? '右侧 JSON 有效' : output?.rightError || '等待输入' }}
            </span>
          </label>
        </div>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的 JSON 差异与 JSONPath 查询结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<JsonDiffJsonPathInput, JsonDiffJsonPathOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="结果" subtitle="先看结构差异，再按需切换文本对比和 JSONPath 查询。">
        <div class="json-diff-summary-grid">
          <ResultCard
            title="结构差异"
            :subtitle="output?.canDiff ? '只统计结构层面的新增、删除和修改' : '需要左右两侧都是合法 JSON'"
            :tone="output?.canDiff ? 'success' : 'danger'"
          >
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">新增</span>
                  <strong class="result-value">{{ output?.structuredDiff?.stats.added ?? 0 }}</strong>
                </div>
                <div>
                  <span class="result-label">删除</span>
                  <strong class="result-value">{{ output?.structuredDiff?.stats.removed ?? 0 }}</strong>
                </div>
              </article>
              <article class="data-row">
                <div>
                  <span class="result-label">修改</span>
                  <strong class="result-value">{{ output?.structuredDiff?.stats.changed ?? 0 }}</strong>
                </div>
                <div>
                  <span class="result-label">未变化</span>
                  <strong class="result-value">{{ output?.structuredDiff?.stats.unchanged ?? 0 }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>

          <ResultCard title="查询摘要" subtitle="当前 JSONPath 匹配结果可直接复制或下载。">
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">匹配数</span>
                  <strong class="result-value">{{ output?.jsonPathResult.value?.length ?? 0 }}</strong>
                </div>
                <button type="button" class="ghost-button small-button" :disabled="!output?.queryMatchesText" @click="copyValue(output?.queryMatchesText || '', 'JSONPath 结果')">
                  复制结果
                </button>
              </article>
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
          :subtitle="output?.canDiff ? '按 JSON 路径列出新增、删除、修改和未变化项。' : '当前无法生成结构差异'"
        >
          <div v-if="output?.structuredDiff?.entries.length" class="json-diff-entry-list">
            <article
              v-for="entry in output.structuredDiff.entries"
              :key="`${entry.kind}-${entry.path}`"
              class="json-diff-entry"
              :data-kind="entry.kind"
            >
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
          <div v-if="output?.textDiff.rows.length" class="diff-grid">
            <article
              v-for="(row, index) in output.textDiff.rows"
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
              <input v-model="state.input.value.queryExpression" class="text-input" type="text" placeholder="$.items[*].id" />
            </label>

            <div class="tab-row">
              <button type="button" class="tab-button" :data-active="state.input.value.querySource === 'left'" @click="state.input.value.querySource = 'left'">
                左侧
              </button>
              <button type="button" class="tab-button" :data-active="state.input.value.querySource === 'right'" @click="state.input.value.querySource = 'right'">
                右侧
              </button>
            </div>
          </div>

          <div v-if="output?.jsonPathResult.ok && output.jsonPathResult.value?.length" class="jsonpath-result-list">
            <article v-for="item in output.jsonPathResult.value" :key="item.path" class="jsonpath-result-card">
              <div class="result-panel-header">
                <span class="result-panel-title">{{ item.path }}</span>
              </div>
              <pre>{{ formatJsonPathResultValue(item.value) }}</pre>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>{{ output?.jsonPathResult.error || '当前表达式没有匹配结果' }}</p>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>

<style scoped>
.json-diff-editor-grid,
.json-diff-summary-grid {
  display: grid;
  gap: 0.875rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.json-diff-entry-list,
.jsonpath-result-list {
  display: grid;
  gap: 0.75rem;
}

.json-diff-entry,
.jsonpath-result-card {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--surface-card-border);
  background: var(--surface-card-bg);
  color: var(--text);
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
