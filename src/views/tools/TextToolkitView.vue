<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage, writeStorage } from '@/lib/storage'
import {
  buildTextToolkitStats,
  defaultTextToolkitOptions,
  processTextToolkit,
  type TextCaseMode,
  type TextToolkitOptions,
} from '@/lib/text-toolkit'

interface TextTemplate {
  label: string
  summary: string
  input: string
  options?: Partial<TextToolkitOptions>
}

const textToolkitDomain = 'tool-history:text-toolkit:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      input: string
      options: TextToolkitOptions
    }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<
  Partial<{
    input: string
    options: TextToolkitOptions
  }>
>(textToolkitDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const templates: TextTemplate[] = [
  {
    label: '去重排序',
    summary: '适合处理 tag、名单、模块名、域名等按行列表。',
    input: 'request-converter\njson-toolkit\nrequest-converter\nhash-studio',
    options: {
      trimLines: true,
      dedupeLines: true,
      sortLines: true,
    },
  },
  {
    label: '清理空白',
    summary: '适合清洗日志、文案、配置片段中的空白字符。',
    input: 'hello    world\n\nmagic-box    ships\t\tfaster',
    options: {
      collapseSpaces: true,
      removeBlankLines: true,
    },
  },
  {
    label: '批量前缀',
    summary: '适合快速为多行内容补 `- `、`> `、`export ` 等前缀。',
    input: 'json-toolkit\nrequest-converter\nurl-inspector',
    options: {
      prefix: '- ',
    },
  },
]

const inputText = ref(
  savedState.input ??
    'magic box\nships faster\n\nrequest-converter\nrequest-converter'
)
const options = ref<TextToolkitOptions>({
  ...defaultTextToolkitOptions,
  ...savedState.options,
})
const toastMessage = ref('')

const outputText = computed(() => processTextToolkit(inputText.value, options.value))
const inputStats = computed(() => buildTextToolkitStats(inputText.value))
const outputStats = computed(() => buildTextToolkitStats(outputText.value))
const hasChanges = computed(() => outputText.value !== inputText.value)

watch(
  [inputText, options],
  () => {
    writeStorage(textToolkitDomain, {
      input: inputText.value,
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

function applyTemplate(template: TextTemplate) {
  inputText.value = template.input
  options.value = {
    ...defaultTextToolkitOptions,
    ...template.options,
  }
}

function useOutputAsInput() {
  inputText.value = outputText.value
}

function clearAll() {
  inputText.value = ''
  options.value = {
    ...defaultTextToolkitOptions,
  }
}

function updateCaseMode(mode: TextCaseMode) {
  options.value = {
    ...options.value,
    caseMode: mode,
  }
}
</script>

<template>
  <ToolPageLayout wide class="text-toolkit-page">
    <template #editor>
      <ToolPanel title="输入区" subtitle="把常见文本整理动作收敛到一个面板里，适合快速处理碎片化文本。">
        <label class="field-row">
          <span class="field-label">原始文本</span>
          <textarea
            v-model="inputText"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="输入或粘贴要处理的文本"
          />
        </label>

        <ToolActionBar>
          <button type="button" class="solid-button" @click="copyValue(outputText, '处理结果')">复制结果</button>
          <button type="button" class="ghost-button" :disabled="!hasChanges" @click="useOutputAsInput">
            用结果覆盖输入
          </button>
          <button type="button" class="ghost-button" @click="clearAll">清空</button>
        </ToolActionBar>

        <ToolPanel title="大小写转换">
          <div class="tab-row">
            <button
              type="button"
              class="tab-button"
              :data-active="options.caseMode === 'none'"
              @click="updateCaseMode('none')"
            >
              保持不变
            </button>
            <button
              type="button"
              class="tab-button"
              :data-active="options.caseMode === 'upper'"
              @click="updateCaseMode('upper')"
            >
              全大写
            </button>
            <button
              type="button"
              class="tab-button"
              :data-active="options.caseMode === 'lower'"
              @click="updateCaseMode('lower')"
            >
              全小写
            </button>
            <button
              type="button"
              class="tab-button"
              :data-active="options.caseMode === 'title'"
              @click="updateCaseMode('title')"
            >
              Title Case
            </button>
          </div>
        </ToolPanel>

        <ToolPanel title="行处理">
          <div class="text-option-grid">
            <label class="text-option-item">
              <input v-model="options.trimLines" type="checkbox" />
              <span>去除每行首尾空白</span>
            </label>
            <label class="text-option-item">
              <input v-model="options.removeBlankLines" type="checkbox" />
              <span>删除空行</span>
            </label>
            <label class="text-option-item">
              <input v-model="options.collapseSpaces" type="checkbox" />
              <span>合并连续空格</span>
            </label>
            <label class="text-option-item">
              <input v-model="options.dedupeLines" type="checkbox" />
              <span>按行去重</span>
            </label>
            <label class="text-option-item">
              <input v-model="options.sortLines" type="checkbox" />
              <span>按行排序</span>
            </label>
          </div>
        </ToolPanel>

        <ToolPanel title="前后缀">
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">前缀</span>
              <input v-model="options.prefix" class="text-input" type="text" placeholder="- " />
            </label>
            <label class="field-row">
              <span class="field-label">后缀</span>
              <input v-model="options.suffix" class="text-input" type="text" placeholder=" ;" />
            </label>
          </div>
        </ToolPanel>

        <ToolPanel title="模板">
          <div class="text-template-list">
            <button
              v-for="template in templates"
              :key="template.label"
              type="button"
              class="text-template-card"
              @click="applyTemplate(template)"
            >
              <div class="text-template-top">
                <strong>{{ template.label }}</strong>
                <span class="text-template-action">使用模板</span>
              </div>
              <p>{{ template.summary }}</p>
            </button>
          </div>
        </ToolPanel>
      </ToolPanel>
    </template>

    <template #viewer>
      <ToolPanel title="输出区" subtitle="结果实时计算，适合清洗列表、整理文案、批量补前后缀。">
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
          <textarea
            :value="outputText"
            class="text-area text-area-full"
            readonly
            placeholder="处理结果会显示在这里"
          />
        </ResultCard>
      </ToolPanel>
    </template>
  </ToolPageLayout>

  <section>
    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>

<style scoped>
.text-option-grid,
.text-template-list,
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

.text-template-card {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--surface-card-border);
  background: var(--surface-card-bg);
  text-align: left;
  color: var(--text);
}

.text-template-card p {
  margin: 0;
  color: var(--muted);
}

.text-template-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.text-template-action {
  color: var(--accent);
  font-size: 0.875rem;
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
