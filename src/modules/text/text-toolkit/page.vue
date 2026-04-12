<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
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
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import { type TextCaseMode } from './logic'
import {
  buildTextToolkitDownloadPayload,
  textToolkitRuntimeModule,
  type TextToolkitInput,
  type TextToolkitOutput,
} from './module'

const state = useToolState<TextToolkitInput, TextToolkitOutput>(textToolkitRuntimeModule)
const draft = useToolDraft(textToolkitRuntimeModule, state, {
  legacyKeys: ['magic-box:v1:tool-history:text-toolkit:state'],
  parseLegacy: (raw) => {
    try {
      return JSON.parse(raw) as TextToolkitInput
    } catch {
      return undefined
    }
  },
})
const history = useToolHistory(textToolkitRuntimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label: output?.hasChanges ? '文本处理快照' : '文本未变化快照',
    description: input.inputText.split('\n')[0] || '空内容',
  }),
})
const { run, reset } = useToolExecution(textToolkitRuntimeModule, state)
const download = useToolDownload(textToolkitRuntimeModule, state, {
  buildPayload: (_, output) => buildTextToolkitDownloadPayload(output),
})
const samples = useToolSamples(textToolkitRuntimeModule, state)
const share = useToolShare(textToolkitRuntimeModule, state)
const { success: showSuccessMessage, error: showErrorMessage, info: showInfoMessage } = useMessage()

const outputText = computed(() => state.output.value?.outputText ?? '')
const inputStats = computed(
  () =>
    state.output.value?.inputStats ?? {
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
    }
)
const outputStats = computed(
  () =>
    state.output.value?.outputStats ?? {
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
    }
)
const hasChanges = computed(() => state.output.value?.hasChanges ?? false)

share.restoreSharedState()

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

function useOutputAsInput() {
  state.input.value.inputText = outputText.value
  showInfoMessage('已用处理结果覆盖输入')
}

function clearAll() {
  draft.clearDraft()
  reset()
}

function updateCaseMode(mode: TextCaseMode) {
  state.input.value.options = {
    ...state.input.value.options,
    caseMode: mode,
  }
}

onMounted(() => {
  void run()
})

function saveSnapshot() {
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}
</script>

<template>
  <ToolScaffold :meta="textToolkitRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #input>
      <ToolPaneShell title="输入区" subtitle="把常见文本整理动作收敛到一个面板里，适合快速处理碎片化文本。">
        <label class="field-row">
          <span class="field-label">原始文本</span>
          <textarea
            v-model="state.input.value.inputText"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="输入或粘贴要处理的文本"
          />
        </label>

        <ToolPanel title="大小写转换">
          <div class="tab-row">
            <button
              type="button"
              class="tab-button"
              :data-active="state.input.value.options.caseMode === 'none'"
              @click="updateCaseMode('none')"
            >
              保持不变
            </button>
            <button
              type="button"
              class="tab-button"
              :data-active="state.input.value.options.caseMode === 'upper'"
              @click="updateCaseMode('upper')"
            >
              全大写
            </button>
            <button
              type="button"
              class="tab-button"
              :data-active="state.input.value.options.caseMode === 'lower'"
              @click="updateCaseMode('lower')"
            >
              全小写
            </button>
            <button
              type="button"
              class="tab-button"
              :data-active="state.input.value.options.caseMode === 'title'"
              @click="updateCaseMode('title')"
            >
              Title Case
            </button>
          </div>
        </ToolPanel>

        <ToolPanel title="行处理">
          <div class="text-option-grid">
            <label class="text-option-item">
              <input v-model="state.input.value.options.trimLines" type="checkbox" />
              <span>去除每行首尾空白</span>
            </label>
            <label class="text-option-item">
              <input v-model="state.input.value.options.removeBlankLines" type="checkbox" />
              <span>删除空行</span>
            </label>
            <label class="text-option-item">
              <input v-model="state.input.value.options.collapseSpaces" type="checkbox" />
              <span>合并连续空格</span>
            </label>
            <label class="text-option-item">
              <input v-model="state.input.value.options.dedupeLines" type="checkbox" />
              <span>按行去重</span>
            </label>
            <label class="text-option-item">
              <input v-model="state.input.value.options.sortLines" type="checkbox" />
              <span>按行排序</span>
            </label>
          </div>
        </ToolPanel>

        <ToolPanel title="前后缀">
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">前缀</span>
              <input v-model="state.input.value.options.prefix" class="text-input" type="text" placeholder="- " />
            </label>
            <label class="field-row">
              <span class="field-label">后缀</span>
              <input v-model="state.input.value.options.suffix" class="text-input" type="text" placeholder=" ;" />
            </label>
          </div>
        </ToolPanel>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="(sampleId) => samples.applySample(samples.samples.value.find((sample) => sample.id === sampleId)!)"
        />
      </ToolPaneShell>
    </template>

    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="copyValue(outputText, '处理结果')">复制结果</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button v-if="history.historyEnabled" type="button" class="ghost-button" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" :disabled="!hasChanges" @click="useOutputAsInput">用结果覆盖输入</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的文本处理状态。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<TextToolkitInput, TextToolkitOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="输出区" subtitle="结果实时计算，适合清洗列表、整理文案、批量补前后缀。">
        <div class="text-stats-grid">
          <ResultCard title="输入统计" tone="neutral">
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">字符数</span>
                  <strong class="result-value">{{ inputStats.characters }}</strong>
                </div>
                <div>
                  <span class="result-label">词数</span>
                  <strong class="result-value">{{ inputStats.words }}</strong>
                </div>
              </article>
              <article class="data-row">
                <div>
                  <span class="result-label">行数</span>
                  <strong class="result-value">{{ inputStats.lines }}</strong>
                </div>
                <div>
                  <span class="result-label">非空白字符</span>
                  <strong class="result-value">{{ inputStats.charactersNoSpaces }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>

          <ResultCard title="输出统计" :tone="hasChanges ? 'success' : 'neutral'">
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">字符数</span>
                  <strong class="result-value">{{ outputStats.characters }}</strong>
                </div>
                <div>
                  <span class="result-label">词数</span>
                  <strong class="result-value">{{ outputStats.words }}</strong>
                </div>
              </article>
              <article class="data-row">
                <div>
                  <span class="result-label">行数</span>
                  <strong class="result-value">{{ outputStats.lines }}</strong>
                </div>
                <div>
                  <span class="result-label">非空白字符</span>
                  <strong class="result-value">{{ outputStats.charactersNoSpaces }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>
        </div>

        <ResultCard
          title="处理结果"
          :subtitle="hasChanges ? '已根据当前规则生成新结果' : '当前配置不会改变原始文本'"
          :copy-value="outputText"
          copy-label="复制结果"
        >
          <textarea :value="outputText" class="text-area text-area-full" readonly placeholder="处理结果会显示在这里" />
        </ResultCard>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>

<style scoped>
.text-option-grid,
.text-stats-grid {
  display: grid;
  gap: 0.875rem;
}

.text-option-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.text-option-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--text);
}

.text-stats-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 900px) {
  .text-option-grid,
  .text-stats-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
