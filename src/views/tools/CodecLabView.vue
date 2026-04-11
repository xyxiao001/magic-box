<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { type CodecAction, type CodecMode, transformCodec } from '@/lib/codec'
import { readStorage, writeStorage } from '@/lib/storage'

const codecStateDomain = 'tool-history:codec-lab:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      input: string
      mode: CodecMode
      action: CodecAction
    }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<
  Partial<{
    input: string
    mode: CodecMode
    action: CodecAction
  }>
>(codecStateDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const codecInput = ref(
  savedState.input ??
    'https%253A%252F%252Fmagic-box.dev%252Ftools%253Ftab%253Djson%2526keyword%253Dhello%252520world'
)
const codecMode = ref<CodecMode>(savedState.mode ?? 'url')
const codecAction = ref<CodecAction>(savedState.action ?? 'decode-all')
const statusMessage = ref('')

watch(codecMode, (mode) => {
  if (mode === 'url') {
    if (codecAction.value === 'decode-all') {
      return
    }

    codecAction.value = 'decode-all'
    return
  }

  if (codecAction.value === 'decode-all') {
    codecAction.value = 'decode'
  }
})

watch([codecInput, codecMode, codecAction], () => {
  writeStorage(codecStateDomain, {
    input: codecInput.value,
    mode: codecMode.value,
    action: codecAction.value,
  })
})

const codecResult = computed(() => transformCodec(codecInput.value, codecMode.value, codecAction.value))
const codecActions = computed(() =>
  codecMode.value === 'url'
    ? [
        { value: 'decode-all' as const, label: '全部解码' },
        { value: 'decode' as const, label: '解码 1 层' },
        { value: 'encode' as const, label: 'URL 编码' },
      ]
    : [
        { value: 'decode' as const, label: 'Base64 解码' },
        { value: 'encode' as const, label: 'Base64 编码' },
      ]
)
const resultHint = computed(() => {
  if (statusMessage.value) {
    return statusMessage.value
  }

  if (!codecResult.value.ok) {
    return codecResult.value.error
  }

  if (codecMode.value === 'url' && codecAction.value === 'decode-all') {
    const layers = codecResult.value.iterations ?? 0
    return layers > 0 ? `已自动解码 ${layers} 层` : '未检测到可继续解码的 URL 编码'
  }

  if (codecMode.value === 'url' && codecAction.value === 'decode') {
    return '已解码 1 层'
  }

  return '转换完成'
})

async function copyOutput() {
  if (!codecResult.value.ok || !codecResult.value.value) {
    statusMessage.value = codecResult.value.error ?? '没有可复制的内容'
    return
  }

  const success = await copyToClipboard(codecResult.value.value)
  statusMessage.value = success ? '结果已复制' : '当前环境不支持复制'

  window.setTimeout(() => {
    statusMessage.value = ''
  }, 1500)
}
</script>

<template>
  <section class="tool-page tool-page-codec">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="field-row">
          <span class="field-label">模式</span>
          <div class="tab-row">
            <button type="button" class="tab-button" :data-active="codecMode === 'url'" @click="codecMode = 'url'">URL</button>
            <button type="button" class="tab-button" :data-active="codecMode === 'base64'" @click="codecMode = 'base64'">
              Base64
            </button>
          </div>
        </div>

        <div class="field-row">
          <span class="field-label">操作</span>
          <div class="tab-row">
            <button
              v-for="action in codecActions"
              :key="action.value"
              type="button"
              class="tab-button"
              :data-active="codecAction === action.value"
              @click="codecAction = action.value"
            >
              {{ action.label }}
            </button>
          </div>
        </div>

        <div class="pane-header">
          <h2 class="pane-title">输入</h2>
          <p class="meta-hint">
            {{ codecMode === 'url' ? '默认优先处理 URL，支持多层 decode。' : '支持中文和包含特殊字符的字符串。' }}
          </p>
        </div>

        <textarea
          v-model="codecInput"
          class="text-area text-area-full"
          spellcheck="false"
          placeholder="输入需要转换的内容"
        />
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <h2 class="pane-title">输出</h2>
          <p class="helper-text" :class="{ 'helper-text-danger': !codecResult.ok }">
            {{ resultHint }}
          </p>
        </div>

        <div class="input-toolbar">
          <button
            type="button"
            class="solid-button"
            :disabled="!codecResult.ok || !codecResult.value"
            @click="copyOutput"
          >
            复制结果
          </button>
          <button type="button" class="ghost-button" @click="codecInput = ''">清空输入</button>
        </div>

        <textarea
          :value="codecResult.ok ? codecResult.value : codecResult.error"
          class="text-area text-area-full"
          readonly
          placeholder="转换结果会显示在这里"
        />
      </section>
    </div>
  </section>
</template>
