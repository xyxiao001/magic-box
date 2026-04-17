<script setup lang="ts">
import { onMounted } from 'vue'
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
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import {
  buildHtmlFormatterDownloadPayload,
  buildHtmlFormatterHistoryLabel,
  htmlFormatterRuntimeModule,
  type HtmlFormatterInput,
  type HtmlFormatterOutput,
} from './module'

const state = useToolState<HtmlFormatterInput, HtmlFormatterOutput>(htmlFormatterRuntimeModule)
const draft = useToolDraft(htmlFormatterRuntimeModule, state, {
  legacyKeys: ['magic-box:v1:tool-history:html-formatter:state'],
})
const history = useToolHistory(htmlFormatterRuntimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label: buildHtmlFormatterHistoryLabel(input),
    description: output?.formattedText.split('\n')[0] ?? '最近一次 HTML 处理结果',
  }),
})
const { run } = useToolExecution(htmlFormatterRuntimeModule, state, {
  onSuccess: ({ input, output }) => {
    history.recordHistory(input, output)
  },
})
const download = useToolDownload(htmlFormatterRuntimeModule, state, {
  buildPayload: (_, output) => buildHtmlFormatterDownloadPayload(output),
})
const samples = useToolSamples(htmlFormatterRuntimeModule, state)
const share = useToolShare(htmlFormatterRuntimeModule, state)
const { success: showSuccessMessage, error: showErrorMessage, info: showInfoMessage } = useMessage()

async function copyOutput() {
  const copied = await copyToClipboard(state.output.value?.formattedText ?? '')

  if (copied) {
    showSuccessMessage('结果已复制')
    return
  }

  showErrorMessage('当前环境不支持复制')
}

function useOutputAsInput() {
  if (!state.output.value?.formattedText) {
    return
  }

  state.input.value.htmlInput = state.output.value.formattedText
  showInfoMessage('已用格式化结果覆盖输入')
}

function clearAll() {
  draft.clearDraft()
  state.input.value.htmlInput = ''
  state.output.value = null
  state.error.value = null
}

share.restoreSharedState()

onMounted(() => {
  void run()
})
</script>

<template>
  <ToolScaffold :meta="htmlFormatterRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #input>
      <ToolPaneShell title="HTML 输入" subtitle="粘贴 HTML，一键格式化缩进或压缩成单行，支持按需补全 doctype。">
        <ToolActionBar>
          <button type="button" class="solid-button" @click="run">格式化</button>
          <button type="button" class="ghost-button" :disabled="!state.output.value?.formattedText" @click="copyOutput">
            复制结果
          </button>
          <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">
            下载结果
          </button>
          <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">
            复制分享链接
          </button>
          <button type="button" class="ghost-button" :disabled="!state.output.value?.hasChanges" @click="useOutputAsInput">
            用结果覆盖输入
          </button>
          <button type="button" class="ghost-button" @click="clearAll">清空</button>
        </ToolActionBar>

        <ToolPanel title="格式化选项">
          <div class="html-option-grid">
            <label class="field-row">
              <span class="field-label">缩进空格数</span>
              <input v-model.number="state.input.value.options.indentSize" class="text-input" type="number" min="2" max="8" step="1" />
            </label>

            <label class="text-option-item">
              <input v-model="state.input.value.options.compact" type="checkbox" />
              <span>压缩成单行</span>
            </label>

            <label class="text-option-item">
              <input v-model="state.input.value.options.addDoctype" type="checkbox" />
              <span>补全 doctype（仅文档结构）</span>
            </label>
          </div>
        </ToolPanel>

        <label class="field-row">
          <span class="field-label">原始 HTML</span>
          <textarea
            v-model="state.input.value.htmlInput"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="&lt;div&gt;Hello&lt;/div&gt;"
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
        empty-text="成功执行一次格式化后，这里会记录最近的 HTML 快照。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<HtmlFormatterInput, HtmlFormatterOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="格式化结果" subtitle="首版聚焦缩进与空白整理，不做语义改写与校验。">
        <div class="html-summary-grid">
          <ResultCard title="输入统计" tone="neutral">
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">字符数</span>
                  <strong class="result-value">{{ state.output.value?.inputStats.characters ?? 0 }}</strong>
                </div>
                <div>
                  <span class="result-label">行数</span>
                  <strong class="result-value">{{ state.output.value?.inputStats.lines ?? 0 }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>

          <ResultCard title="输出统计" :tone="state.output.value ? 'success' : 'neutral'">
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">字符数</span>
                  <strong class="result-value">{{ state.output.value?.outputStats.characters ?? 0 }}</strong>
                </div>
                <div>
                  <span class="result-label">行数</span>
                  <strong class="result-value">{{ state.output.value?.outputStats.lines ?? 0 }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>
        </div>

        <ResultCard
          title="格式化输出"
          :subtitle="state.output.value?.compact ? '当前处于单行压缩模式' : state.output.value?.addedDoctype ? '已补全 doctype' : '当前处于多行格式化模式'"
          :copy-value="state.output.value?.formattedText ?? ''"
          copy-label="复制结果"
          :tone="state.output.value ? 'success' : 'neutral'"
        >
          <textarea
            :value="state.output.value?.formattedText ?? ''"
            class="text-area text-area-full"
            readonly
            :placeholder="state.error.value || '点击格式化后，结果会显示在这里'"
          />
        </ResultCard>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>

<style scoped>
.html-option-grid,
.html-summary-grid {
  display: grid;
  gap: 0.875rem;
}

.html-summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.text-option-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--text);
}

@media (max-width: 900px) {
  .html-summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
