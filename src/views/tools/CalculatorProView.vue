<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  buildDiscountResult,
  buildSplitResult,
  buildTaxResult,
  evaluateExpression,
  type CalculatorHistoryEntry,
  type CalculatorQuickResult,
} from '@/lib/calculator-tool'

const expressionStorageKey = 'magic-box.calculator.expression'
const historyStorageKey = 'magic-box.calculator.history'

const expression = ref(localStorage.getItem(expressionStorageKey) || '128 * 0.85 + 12')
const result = computed(() => {
  try {
    return evaluateExpression(expression.value)
  } catch (error) {
    return error instanceof Error ? error.message : '计算失败'
  }
})

const history = ref<CalculatorHistoryEntry[]>(
  (() => {
    try {
      return JSON.parse(localStorage.getItem(historyStorageKey) || '[]') as CalculatorHistoryEntry[]
    } catch {
      return []
    }
  })()
)

const discountPrice = ref(299)
const discountPercent = ref(15)
const taxAmount = ref(100)
const taxPercent = ref(6)
const splitTotal = ref(168)
const splitPeople = ref(4)
const copiedMessage = ref('')

const discountResults = computed<CalculatorQuickResult[]>(() =>
  buildDiscountResult(discountPrice.value, discountPercent.value)
)
const taxResults = computed<CalculatorQuickResult[]>(() => buildTaxResult(taxAmount.value, taxPercent.value))
const splitResults = computed<CalculatorQuickResult[]>(() => buildSplitResult(splitTotal.value, splitPeople.value))

function saveCurrentExpression() {
  try {
    const currentResult = evaluateExpression(expression.value)
    history.value = [{ expression: expression.value, result: currentResult }, ...history.value].slice(0, 12)
  } catch {
    return
  }
}

function useHistoryEntry(entry: CalculatorHistoryEntry) {
  expression.value = entry.expression
}

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  copiedMessage.value = success ? `${label}已复制` : '当前环境不支持复制'
  window.setTimeout(() => {
    copiedMessage.value = ''
  }, 1600)
}

watch(expression, (value) => {
  localStorage.setItem(expressionStorageKey, value)
})

watch(
  history,
  (value) => {
    localStorage.setItem(historyStorageKey, JSON.stringify(value))
  },
  { deep: true }
)
</script>

<template>
  <section class="tool-page tool-page-calculator">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">表达式计算</h2>
            <p class="meta-hint">支持四则运算、括号和百分比写法，例如 200 * 15%。</p>
          </div>
          <button type="button" class="solid-button" @click="saveCurrentExpression">保存到历史</button>
        </div>

        <label class="field-row">
          <span class="field-label">表达式</span>
          <textarea
            v-model="expression"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="输入表达式，例如：(120 + 30) * 0.85"
          />
        </label>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">结果</span>
            <button type="button" class="ghost-button small-button" @click="copyValue(String(result), '结果')">
              复制结果
            </button>
          </div>

          <div class="calculator-result-card">
            <strong class="calculator-result-value">{{ result }}</strong>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">历史记录</span>
            <span class="meta-hint">保存最近几次有效表达式，便于回算和复用。</span>
          </div>

          <div v-if="history.length" class="timeline-list">
            <article v-for="(entry, index) in history" :key="`${entry.expression}-${index}`" class="timeline-row">
              <span class="timeline-index">{{ index + 1 }}</span>
              <div class="history-entry-body">
                <strong class="result-value">{{ entry.result }}</strong>
                <span class="meta-hint">{{ entry.expression }}</span>
              </div>
              <button type="button" class="ghost-button small-button" @click="useHistoryEntry(entry)">使用</button>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>保存一次计算后，这里会出现历史记录。</p>
          </div>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">快捷模式</h2>
            <p class="meta-hint">首版先覆盖折扣、税率和均摊三类最常见计算场景。</p>
          </div>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">折扣</span>
          </div>
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">原价</span>
              <input v-model.number="discountPrice" class="text-input" type="number" min="0" />
            </label>
            <label class="field-row">
              <span class="field-label">折扣%</span>
              <input v-model.number="discountPercent" class="text-input" type="number" min="0" max="100" />
            </label>
          </div>
          <div class="data-list">
            <article v-for="entry in discountResults" :key="entry.label" class="data-row">
              <div>
                <span class="result-label">{{ entry.label }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
              </div>
            </article>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">税率</span>
          </div>
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">金额</span>
              <input v-model.number="taxAmount" class="text-input" type="number" min="0" />
            </label>
            <label class="field-row">
              <span class="field-label">税率%</span>
              <input v-model.number="taxPercent" class="text-input" type="number" min="0" />
            </label>
          </div>
          <div class="data-list">
            <article v-for="entry in taxResults" :key="entry.label" class="data-row">
              <div>
                <span class="result-label">{{ entry.label }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
              </div>
            </article>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">均摊</span>
          </div>
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">总额</span>
              <input v-model.number="splitTotal" class="text-input" type="number" min="0" />
            </label>
            <label class="field-row">
              <span class="field-label">人数</span>
              <input v-model.number="splitPeople" class="text-input" type="number" min="1" />
            </label>
          </div>
          <div class="data-list">
            <article v-for="entry in splitResults" :key="entry.label" class="data-row">
              <div>
                <span class="result-label">{{ entry.label }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
              </div>
            </article>
          </div>
        </section>
      </section>
    </div>

    <p v-if="copiedMessage" class="clipboard-toast">{{ copiedMessage }}</p>
  </section>
</template>
