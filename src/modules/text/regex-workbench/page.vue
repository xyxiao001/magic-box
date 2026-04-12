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
import { useToolSamples } from '@/tool-runtime/composables/useToolSamples'
import { useToolShare } from '@/tool-runtime/composables/useToolShare'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolSamplePanel from '@/tool-runtime/scaffolds/ToolSamplePanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import {
  buildHighlightSegments,
  buildRegexWorkbenchDownloadPayload,
  buildRegexWorkbenchHistoryLabel,
  createRegexWorkbenchInitialInput,
  regexQuickFlags,
  regexQuickRecipes,
  regexWorkbenchRuntimeModule,
  type HighlightSegment,
  type RegexWorkbenchInput,
  type RegexWorkbenchOutput,
} from './module'

const regexStateDomain = 'tool-history:regex-workbench:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<RegexWorkbenchInput>
  } catch {
    return undefined
  }
}

const savedState = readStorage<Partial<RegexWorkbenchInput>>(regexStateDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const state = useToolState<RegexWorkbenchInput, RegexWorkbenchOutput>(regexWorkbenchRuntimeModule)
const draft = useToolDraft(regexWorkbenchRuntimeModule, state, {
  legacyKeys: [regexStateDomain],
  parseLegacy: (raw) => parseSavedState(raw),
})
const history = useToolHistory(regexWorkbenchRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildRegexWorkbenchHistoryLabel(output) : 'Regex 快照',
    description: output?.analysis.ok ? output.analysis.replacementPreview?.slice(0, 48) ?? '' : output?.analysis.error ?? '',
  }),
})
const { run } = useToolExecution(regexWorkbenchRuntimeModule, state)
const samples = useToolSamples(regexWorkbenchRuntimeModule, state)
const download = useToolDownload(regexWorkbenchRuntimeModule, state, {
  buildPayload: (_, output) => buildRegexWorkbenchDownloadPayload(output),
})
const share = useToolShare(regexWorkbenchRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const defaultInput = createRegexWorkbenchInitialInput()
if (
  state.input.value.pattern === defaultInput.pattern &&
  state.input.value.flags === defaultInput.flags &&
  state.input.value.replacement === defaultInput.replacement &&
  state.input.value.testText === defaultInput.testText
) {
  state.input.value = {
    ...state.input.value,
    ...savedState,
  }
}

const restoredSharedState = share.restoreSharedState()
const analysis = computed(() => state.output.value?.analysis)
const highlightSegments = computed(() => {
  if (!analysis.value?.ok || !analysis.value.matches) {
    return [{ kind: 'plain', value: state.input.value.testText }] satisfies HighlightSegment[]
  }

  return buildHighlightSegments(state.input.value.testText, analysis.value.matches)
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

  if (!sample) {
    return
  }

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
  if (!state.output.value) {
    return
  }

  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

function clearAll() {
  draft.clearDraft()
  state.input.value = {
    ...createRegexWorkbenchInitialInput(),
    pattern: '',
    replacement: '',
    testText: '',
  }
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
  <ToolScaffold :meta="regexWorkbenchRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button
          type="button"
          class="solid-button"
          :disabled="!analysis?.ok || !analysis?.replacementPreview"
          @click="copyValue(analysis?.replacementPreview || '', '替换预览')"
        >
          复制替换结果
        </button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="输入区" subtitle="输入 Pattern、Flags、Replacement 和测试文本，右侧实时展示命中与替换效果。">
        <div class="regex-field-grid">
          <label class="field-row">
            <span class="field-label">Pattern</span>
            <input v-model="state.input.value.pattern" class="text-input" type="text" placeholder="例如 (?<name>[a-z]+)=(\\d+)" />
          </label>

          <label class="field-row regex-flags-field">
            <span class="field-label">Flags</span>
            <input v-model="state.input.value.flags" class="text-input" type="text" placeholder="gim" />
          </label>
        </div>

        <label class="field-row">
          <span class="field-label">Replacement</span>
          <input v-model="state.input.value.replacement" class="text-input" type="text" placeholder="$1 / $<name>" />
        </label>

        <label class="field-row">
          <span class="field-label">Test Text</span>
          <textarea v-model="state.input.value.testText" class="text-area text-area-full" spellcheck="false" placeholder="输入测试文本" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <ToolPanel title="常用速查" subtitle="保留最常用的 flags 和正则片段，减少来回查文档。">
          <div class="regex-reference-grid">
            <article class="regex-reference-card">
              <h3 class="regex-reference-title">Flags</h3>
              <div class="regex-reference-list">
                <div v-for="flag in regexQuickFlags" :key="flag.flag" class="regex-reference-item">
                  <code class="regex-reference-token">{{ flag.flag }}</code>
                  <p class="regex-reference-copy">{{ flag.meaning }}</p>
                </div>
              </div>
            </article>

            <article class="regex-reference-card">
              <h3 class="regex-reference-title">常见片段</h3>
              <div class="regex-reference-list">
                <div v-for="recipe in regexQuickRecipes" :key="recipe.token" class="regex-reference-item">
                  <code class="regex-reference-token">{{ recipe.token }}</code>
                  <p class="regex-reference-copy">{{ recipe.meaning }}</p>
                </div>
              </div>
            </article>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的正则实验结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<RegexWorkbenchInput, RegexWorkbenchOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="结果区" :subtitle="analysis?.ok ? `命中 ${analysis.matchCount} 项，替换结果实时联动` : analysis?.error || '等待输入'">
        <ToolPanel title="命中高亮" subtitle="整段文本按命中区间高亮，零宽匹配会显示为 `∅`。">
          <div v-if="analysis?.ok" class="regex-highlight-canvas">
            <template v-for="(segment, index) in highlightSegments" :key="`${segment.kind}-${index}`">
              <mark v-if="segment.kind === 'match'" class="regex-highlight-match" :class="{ 'regex-highlight-match-zero': segment.zeroWidth }">
                <span class="regex-highlight-order">#{{ segment.matchNumber }}</span>
                {{ segment.value }}
              </mark>
              <span v-else class="regex-highlight-plain">{{ segment.value }}</span>
            </template>
          </div>
          <div v-else class="empty-panel">
            <p>正则无效时不会生成高亮，先修正表达式或 flags。</p>
          </div>
        </ToolPanel>

        <ToolPanel title="替换预览">
          <pre class="regex-preview">{{ analysis?.ok ? analysis.replacementPreview : '' }}</pre>
        </ToolPanel>

        <ToolPanel title="命中列表">
          <div v-if="analysis?.ok && analysis.matches?.length" class="regex-match-list">
            <article v-for="(match, index) in analysis.matches" :key="`${match.index}-${index}`" class="regex-match-card">
              <div class="regex-match-top">
                <strong>#{{ index + 1 }}</strong>
                <span class="regex-match-index">index {{ match.index }}</span>
              </div>
              <code class="regex-hit">{{ match.value || '∅' }}</code>

              <div v-if="match.groups.length" class="regex-groups">
                <span v-for="group in match.groups" :key="group.index" class="regex-group-chip">${{ group.index }}: {{ group.value || '∅' }}</span>
              </div>

              <div v-if="Object.keys(match.namedGroups).length" class="regex-groups">
                <span v-for="(value, key) in match.namedGroups" :key="key" class="regex-group-chip regex-group-chip-named">
                  {{ key }}: {{ value || '∅' }}
                </span>
              </div>
            </article>
          </div>
          <div v-else-if="analysis?.ok" class="empty-panel">
            <p>当前没有命中结果，可以试试模板或调整 flags。</p>
          </div>
          <div v-else class="empty-panel">
            <p>表达式合法后，这里会展示命中列表和捕获组。</p>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>

<style scoped>
.regex-highlight-canvas {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
}

.regex-highlight-match {
  padding: 0.125rem 0.25rem;
  border-radius: 8px;
  background: rgba(96, 165, 250, 0.18);
  color: var(--text);
}

.regex-highlight-match-zero {
  background: rgba(244, 114, 182, 0.18);
}

.regex-highlight-order {
  margin-right: 0.25rem;
  color: var(--accent);
}

.regex-preview {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.regex-match-list {
  display: grid;
  gap: 0.75rem;
}

.regex-match-card {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--surface-card-border);
  background: var(--surface-card-bg);
}

.regex-match-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.regex-match-index {
  color: var(--muted);
}

.regex-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.regex-group-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.12);
  color: var(--text);
}

.regex-group-chip-named {
  background: rgba(74, 222, 128, 0.12);
}

.regex-reference-grid {
  display: grid;
  gap: 0.875rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.regex-reference-card {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--surface-card-border);
  background: var(--surface-card-bg);
}

.regex-reference-title {
  margin: 0;
  font-size: 1rem;
}

.regex-reference-list {
  display: grid;
  gap: 0.75rem;
}

.regex-reference-item {
  display: grid;
  gap: 0.25rem;
}

.regex-reference-token {
  width: fit-content;
}

.regex-reference-copy {
  margin: 0;
  color: var(--muted);
}

@media (max-width: 900px) {
  .regex-reference-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
