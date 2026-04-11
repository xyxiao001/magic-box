<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ErrorBanner from '@/components/toolkit/ErrorBanner.vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage, writeStorage } from '@/lib/storage'
import {
  generateIdBatch,
  nanoAlphabetPresets,
  validateNanoId,
  validateUuidV4,
  type IdMode,
  type NanoAlphabetPreset,
} from '@/lib/uuid-studio'

const uuidStudioDomain = 'tool-history:uuid-studio:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      mode: IdMode
      batchCount: number
      nanoLength: number
      alphabetPreset: NanoAlphabetPreset
      customAlphabet: string
      validationInput: string
    }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<
  Partial<{
    mode: IdMode
    batchCount: number
    nanoLength: number
    alphabetPreset: NanoAlphabetPreset
    customAlphabet: string
    validationInput: string
  }>
>(uuidStudioDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const mode = ref<IdMode>(savedState.mode ?? 'uuid')
const batchCount = ref(savedState.batchCount ?? 5)
const nanoLength = ref(savedState.nanoLength ?? 21)
const alphabetPreset = ref<NanoAlphabetPreset>(savedState.alphabetPreset ?? 'default')
const customAlphabet = ref(savedState.customAlphabet ?? nanoAlphabetPresets.default)
const validationInput = ref(savedState.validationInput ?? '')
const results = ref<string[]>([])
const errorMessage = ref('')
const toastMessage = ref('')

const effectiveAlphabet = computed(() => customAlphabet.value)

const validationSummary = computed(() => {
  if (!validationInput.value.trim()) {
    return '输入一个 ID 后可立即校验格式'
  }

  return mode.value === 'uuid'
    ? validateUuidV4(validationInput.value)
      ? '这是合法的 UUID v4'
      : '不是合法的 UUID v4'
    : validateNanoId(validationInput.value, effectiveAlphabet.value)
      ? '字符集匹配当前 NanoID 规则'
      : '不符合当前 NanoID 字符集规则'
})

watch([mode, batchCount, nanoLength, alphabetPreset, customAlphabet, validationInput], () => {
  writeStorage(uuidStudioDomain, {
    mode: mode.value,
    batchCount: batchCount.value,
    nanoLength: nanoLength.value,
    alphabetPreset: alphabetPreset.value,
    customAlphabet: customAlphabet.value,
    validationInput: validationInput.value,
  })
})

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  toastMessage.value = success ? `${label}已复制` : '当前环境不支持复制'

  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

function generateIds() {
  errorMessage.value = ''

  try {
    const count = Math.min(50, Math.max(1, batchCount.value))
    const length = Math.min(64, Math.max(4, nanoLength.value))
    results.value = generateIdBatch(mode.value, count, length, effectiveAlphabet.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '生成失败'
    results.value = []
  }
}

function usePreset(preset: NanoAlphabetPreset) {
  alphabetPreset.value = preset
  customAlphabet.value = nanoAlphabetPresets[preset]
}

function clearAll() {
  results.value = []
  validationInput.value = ''
}

generateIds()
</script>

<template>
  <ToolPageLayout wide>
    <template #editor>
      <ToolPanel title="生成配置" subtitle="支持 UUID v4 与 NanoID，适合批量生成测试数据、主键和临时标识。">
        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="mode === 'uuid'" @click="mode = 'uuid'">
            UUID v4
          </button>
          <button type="button" class="tab-button" :data-active="mode === 'nanoid'" @click="mode = 'nanoid'">
            NanoID
          </button>
        </div>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">批量数量</span>
            <input v-model.number="batchCount" class="text-input" type="number" min="1" max="50" />
          </label>
          <label v-if="mode === 'nanoid'" class="field-row">
            <span class="field-label">长度</span>
            <input v-model.number="nanoLength" class="text-input" type="number" min="4" max="64" />
          </label>
        </div>

        <template v-if="mode === 'nanoid'">
          <ToolPanel title="字符集">
            <ToolActionBar>
              <button type="button" class="ghost-button small-button" @click="usePreset('default')">默认</button>
              <button type="button" class="ghost-button small-button" @click="usePreset('lowercase')">小写字母</button>
              <button type="button" class="ghost-button small-button" @click="usePreset('numbers')">纯数字</button>
              <button type="button" class="ghost-button small-button" @click="usePreset('hex')">Hex</button>
            </ToolActionBar>

            <label class="field-row">
              <span class="field-label">当前字符集</span>
              <textarea v-model="customAlphabet" class="text-area text-area-compact" spellcheck="false" />
            </label>
          </ToolPanel>
        </template>

        <ToolActionBar>
          <button type="button" class="solid-button" @click="generateIds">生成</button>
          <button
            type="button"
            class="ghost-button"
            :disabled="!results.length"
            @click="copyValue(results.join('\n'), '全部结果')"
          >
            复制全部
          </button>
          <button type="button" class="ghost-button" @click="clearAll">清空校验</button>
        </ToolActionBar>

        <ErrorBanner
          v-if="errorMessage"
          title="生成失败"
          :message="errorMessage"
          hint="请检查当前环境是否支持 Web Crypto，或确认字符集不为空。"
        />

        <ToolPanel title="格式校验" subtitle="可快速判断一个 ID 是否符合当前模式。">
          <label class="field-row">
            <span class="field-label">待校验 ID</span>
            <textarea
              v-model="validationInput"
              class="text-area text-area-compact"
              spellcheck="false"
              placeholder="粘贴一个 UUID 或 NanoID"
            />
          </label>
          <p class="helper-text">{{ validationSummary }}</p>
        </ToolPanel>
      </ToolPanel>
    </template>

    <template #viewer>
      <ToolPanel title="生成结果" subtitle="支持批量复制和逐条复制，可直接作为接口调试和测试数据输入。">
        <ResultCard
          title="结果摘要"
          :subtitle="`${mode === 'uuid' ? 'UUID v4' : 'NanoID'} · 共 ${results.length} 条`"
          :copy-value="results.join('\n')"
          copy-label="复制全部"
        >
          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">模式</span>
                <strong class="result-value">{{ mode === 'uuid' ? 'UUID v4' : 'NanoID' }}</strong>
              </div>
              <div>
                <span class="result-label">批量数量</span>
                <strong class="result-value">{{ results.length }}</strong>
              </div>
            </article>
            <article v-if="mode === 'nanoid'" class="data-row">
              <div>
                <span class="result-label">长度</span>
                <strong class="result-value">{{ nanoLength }}</strong>
              </div>
              <div>
                <span class="result-label">字符集长度</span>
                <strong class="result-value">{{ effectiveAlphabet.length }}</strong>
              </div>
            </article>
          </div>
        </ResultCard>

        <div v-if="results.length" class="uuid-result-list">
          <ResultCard
            v-for="(item, index) in results"
            :key="item"
            :title="`${mode === 'uuid' ? 'UUID' : 'NanoID'} #${index + 1}`"
            :copy-value="item"
            :copy-label="`复制 #${index + 1}`"
          >
            <code class="package-command-code uuid-code">{{ item }}</code>
          </ResultCard>
        </div>
      </ToolPanel>
    </template>
  </ToolPageLayout>

  <section>
    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>

<style scoped>
.uuid-result-list {
  display: grid;
  gap: 0.875rem;
}

.uuid-code {
  overflow-wrap: anywhere;
}
</style>
