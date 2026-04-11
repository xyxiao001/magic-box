<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { buildTimeLabResult } from '@/lib/time'
import { readStorage, writeStorage } from '@/lib/storage'

const timeInputDomain = 'tool-history:time-lab:input'
const timeInput = ref(readStorage(timeInputDomain, String(Date.now()), { parseLegacy: (raw) => raw }))
const copiedLabel = ref('')

const timeResult = computed(() => buildTimeLabResult(timeInput.value))
const timeRows = computed(() => {
  if (!timeResult.value) {
    return []
  }

  return [
    { label: 'ISO', value: timeResult.value.iso },
    { label: '本地时间', value: timeResult.value.local },
    { label: 'UTC', value: timeResult.value.utc },
    { label: 'Unix 秒', value: timeResult.value.unixSeconds },
    { label: 'Unix 毫秒', value: timeResult.value.unixMilliseconds },
  ]
})

const timeError = computed(() => {
  if (!timeInput.value.trim()) {
    return '输入 10 位秒级、13 位毫秒级时间戳，或标准日期字符串。'
  }

  return timeResult.value ? '' : '无法识别这个时间输入。'
})

async function handleCopy(value: string, label: string) {
  const success = await copyToClipboard(value)
  copiedLabel.value = success ? `${label} 已复制` : '当前环境不支持复制'

  window.setTimeout(() => {
    copiedLabel.value = ''
  }, 1600)
}

function fillCurrentTime() {
  timeInput.value = String(Date.now())
}

function setExample(value: string) {
  timeInput.value = value
}

watch(timeInput, (value) => {
  writeStorage(timeInputDomain, value)
})
</script>

<template>
  <section class="tool-page tool-page-time">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <h2 class="pane-title">输入</h2>
          <p class="meta-hint">支持 `1712534400`、`1712534400000`、`2026-04-08 16:00:00`。</p>
        </div>

        <label class="field-label" for="time-input">时间内容</label>
        <textarea
          id="time-input"
          v-model="timeInput"
          class="text-area text-area-compact"
          spellcheck="false"
          placeholder="输入时间戳或日期字符串"
        />

        <div class="input-toolbar">
          <button type="button" class="solid-button" @click="fillCurrentTime">当前时间</button>
          <button type="button" class="ghost-button" @click="setExample('1712534400')">
            秒级示例
          </button>
          <button
            type="button"
            class="ghost-button"
            @click="setExample('2026-04-08T16:00:00Z')"
          >
            ISO 示例
          </button>
        </div>

        <p class="helper-text" :class="{ 'helper-text-danger': timeError }">
          {{ timeError || '识别成功。' }}
        </p>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <h2 class="pane-title">结果</h2>
          <p class="meta-hint">点击右侧按钮可复制单项结果。</p>
        </div>

        <div v-if="timeRows.length" class="data-list">
          <article v-for="row in timeRows" :key="row.label" class="data-row">
            <div>
              <span class="result-label">{{ row.label }}</span>
              <strong class="result-value">{{ row.value }}</strong>
            </div>
            <button type="button" class="ghost-button small-button" @click="handleCopy(row.value, row.label)">
              复制
            </button>
          </article>
        </div>

        <div v-else class="empty-panel">
          <p>输入有效时间后，这里会显示完整转换结果。</p>
        </div>
      </section>
    </div>

    <p v-if="copiedLabel" class="clipboard-toast">{{ copiedLabel }}</p>
  </section>
</template>
