<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolCapabilityRuntime } from '@/tool-runtime/composables/useToolCapabilityRuntime'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import { type TextCaseMode } from './logic'
import { textToolkitRuntimeModule, type TextToolkitInput, type TextToolkitOutput } from './module'

const state = useToolState<TextToolkitInput, TextToolkitOutput>(textToolkitRuntimeModule)
const execution = useToolExecution(textToolkitRuntimeModule, state, {
  onSuccess: ({ input, output }) => {
    runtime.handleExecutionSuccess(input, output)
  },
})
const runtime = useToolCapabilityRuntime(textToolkitRuntimeModule, state, execution)
const { run } = execution
const { info: showInfoMessage } = useMessage()

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

void runtime.restoreSharedState()

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

function useOutputAsInput() {
  state.input.value.inputText = outputText.value
  showInfoMessage('已用处理结果覆盖输入')
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
</script>

<template>
  <ToolScaffold
    :meta="textToolkitRuntimeModule.meta"
    :loading="state.loading.value"
    :error="state.error.value"
    :sample-panel="runtime.samplePanel.value"
    :history-panel="runtime.historyPanel.value"
    wide
  >
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
      </ToolPaneShell>
    </template>

    <template #actions>
      <ToolActionBar :items="runtime.actionItems.value">
        <button type="button" class="ghost-button" :disabled="!hasChanges" @click="useOutputAsInput">用结果覆盖输入</button>
      </ToolActionBar>
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
