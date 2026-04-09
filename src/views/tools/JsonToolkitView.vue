<script setup lang="ts">
import { ref } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { formatJson, minifyJson, validateJson } from '@/lib/json-tool'
const jsonInput = ref(`{
  "name": "Magic Box",
  "stack": ["Vue 3", "Vite", "TypeScript"],
  "favorite": true
}`)
const jsonOutput = ref('')
const statusMessage = ref('准备就绪')
const statusTone = ref<'neutral' | 'success' | 'danger'>('neutral')

function applyStatus(message: string, tone: 'neutral' | 'success' | 'danger') {
  statusMessage.value = message
  statusTone.value = tone
}

function runFormat() {
  const result = formatJson(jsonInput.value)

  if (!result.ok) {
    jsonOutput.value = ''
    applyStatus(result.error ?? 'JSON 解析失败', 'danger')
    return
  }

  jsonOutput.value = result.value ?? ''
  applyStatus('格式化完成', 'success')
}

function runMinify() {
  const result = minifyJson(jsonInput.value)

  if (!result.ok) {
    jsonOutput.value = ''
    applyStatus(result.error ?? 'JSON 解析失败', 'danger')
    return
  }

  jsonOutput.value = result.value ?? ''
  applyStatus('压缩完成', 'success')
}

function runValidate() {
  const result = validateJson(jsonInput.value)

  jsonOutput.value = ''
  applyStatus(result.ok ? result.value ?? 'JSON 有效' : result.error ?? 'JSON 解析失败', result.ok ? 'success' : 'danger')
}

function useOutputAsInput() {
  if (!jsonOutput.value) {
    return
  }

  jsonInput.value = jsonOutput.value
  applyStatus('已应用到左侧输入区', 'neutral')
}

async function copyOutput() {
  const success = await copyToClipboard(jsonOutput.value)
  applyStatus(success ? '输出已复制' : '当前环境不支持复制', success ? 'neutral' : 'danger')
}
</script>

<template>
  <section class="tool-page tool-page-json">
    <div class="tool-page-layout wide-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <h2 class="pane-title">原始内容</h2>
          <p class="meta-hint">适合直接粘贴接口响应、配置文件和临时调试数据。</p>
        </div>

        <textarea
          v-model="jsonInput"
          class="text-area text-area-full"
          spellcheck="false"
          placeholder='{"name":"magic-box"}'
        />
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <h2 class="pane-title">结果</h2>
          <p
            class="helper-text"
            :class="{
              'helper-text-success': statusTone === 'success',
              'helper-text-danger': statusTone === 'danger',
            }"
          >
            {{ statusMessage }}
          </p>
        </div>

        <div class="input-toolbar">
          <button type="button" class="solid-button" @click="runFormat">格式化</button>
          <button type="button" class="ghost-button" @click="runMinify">压缩</button>
          <button type="button" class="ghost-button" @click="runValidate">校验</button>
          <button type="button" class="ghost-button" @click="useOutputAsInput">应用到输入</button>
          <button type="button" class="ghost-button" @click="copyOutput">复制输出</button>
        </div>

        <textarea
          :value="jsonOutput"
          class="text-area text-area-full"
          readonly
          placeholder="处理结果会显示在这里"
        />
      </section>
    </div>
  </section>
</template>
