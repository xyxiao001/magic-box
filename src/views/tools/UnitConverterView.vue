<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage, writeStorage } from '@/lib/storage'
import { buildConvertedResults, unitCategories } from '@/lib/unit-converter'

const storageKey = 'magic-box.unit-converter.state'
const storageDomain = 'tool-history:unit-converter:state'

function parseStoredState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      category: string
      value: number
      unit: string
    }>
  } catch {
    return undefined
  }
}

const saved = (() => {
  return readStorage<Partial<{ category: string; value: number; unit: string }>>(storageDomain, {}, {
    legacyKeys: [storageKey],
    parseLegacy: (raw) => parseStoredState(raw),
  })
})()

const categoryKey = ref(saved.category || 'length')
const sourceValue = ref(Number(saved.value ?? 1))
const sourceUnit = ref(saved.unit || 'm')
const copiedMessage = ref('')

const category = computed(() => unitCategories[categoryKey.value] || unitCategories.length)
const convertedResults = computed(() =>
  buildConvertedResults(categoryKey.value, sourceValue.value, sourceUnit.value)
)

watch(categoryKey, (value) => {
  const firstUnit = Object.keys(unitCategories[value]?.units || {})[0]
  if (firstUnit) {
    sourceUnit.value = firstUnit
  }
})

watch([categoryKey, sourceValue, sourceUnit], () => {
  writeStorage(storageDomain, {
    category: categoryKey.value,
    value: sourceValue.value,
    unit: sourceUnit.value,
  })
})

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  copiedMessage.value = success ? `${label}已复制` : '当前环境不支持复制'
  window.setTimeout(() => {
    copiedMessage.value = ''
  }, 1600)
}
</script>

<template>
  <section class="tool-page tool-page-converter">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">单位换算</h2>
            <p class="meta-hint">覆盖长度、重量、温度、存储、速度等常见分类。</p>
          </div>
        </div>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">分类</span>
            <select v-model="categoryKey" class="select-input">
              <option v-for="(item, key) in unitCategories" :key="key" :value="key">{{ item.label }}</option>
            </select>
          </label>

          <label class="field-row">
            <span class="field-label">源单位</span>
            <select v-model="sourceUnit" class="select-input">
              <option v-for="(unit, key) in category.units" :key="key" :value="key">{{ unit.label }}</option>
            </select>
          </label>
        </div>

        <label class="field-row">
          <span class="field-label">数值</span>
          <input v-model.number="sourceValue" class="text-input" type="number" />
        </label>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">当前输入</span>
          </div>
          <div class="data-row">
            <div>
              <span class="result-label">源值</span>
              <strong class="result-value">{{ sourceValue }} {{ category.units[sourceUnit]?.label }}</strong>
            </div>
          </div>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">换算结果</h2>
            <p class="meta-hint">所有结果实时更新，可按条复制。</p>
          </div>
        </div>

        <div class="converter-grid">
          <article v-for="entry in convertedResults" :key="entry.unit" class="color-card">
            <span class="result-label">{{ entry.label }}</span>
            <strong class="result-value">{{ entry.value }}</strong>
            <button
              type="button"
              class="ghost-button small-button"
              @click="copyValue(`${entry.value} ${entry.label}`, entry.label)"
            >
              复制
            </button>
          </article>
        </div>
      </section>
    </div>

    <p v-if="copiedMessage" class="clipboard-toast">{{ copiedMessage }}</p>
  </section>
</template>
