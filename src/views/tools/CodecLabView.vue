<script setup lang="ts">
import { computed, ref } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { transformCodec } from '@/lib/codec'
import { useWorkbenchStore } from '@/stores/workbench'

const workbenchStore = useWorkbenchStore()
const codecInput = ref('hello world')
const codecMode = ref<'base64' | 'url'>('base64')
const codecAction = ref<'encode' | 'decode'>('encode')
const statusMessage = ref('')

const codecResult = computed(() =>
  transformCodec(codecInput.value, codecMode.value, codecAction.value)
)

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
    <header class="tool-page-header">
      <div>
        <div class="pill-row">
          <span class="section-badge">编码</span>
          <span class="status-badge">Codec Lab</span>
        </div>
        <h1 class="tool-page-title">Base64 / URL 编解码</h1>
        <p class="tool-page-description">切换模式和动作后，右侧结果会同步更新。</p>
      </div>

      <button
        type="button"
        class="ghost-button"
        @click="workbenchStore.toggleFavoriteModule('codec-lab')"
      >
        {{ workbenchStore.favoriteModuleIds.includes('codec-lab') ? '取消收藏' : '收藏工具' }}
      </button>
    </header>

    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">模式</span>
            <select v-model="codecMode" class="select-input">
              <option value="base64">Base64</option>
              <option value="url">URL</option>
            </select>
          </label>

          <label class="field-row">
            <span class="field-label">动作</span>
            <select v-model="codecAction" class="select-input">
              <option value="encode">Encode</option>
              <option value="decode">Decode</option>
            </select>
          </label>
        </div>

        <div class="pane-header">
          <h2 class="pane-title">输入</h2>
          <p class="meta-hint">支持中文和包含特殊字符的字符串。</p>
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
            {{ statusMessage || (codecResult.ok ? '转换完成' : codecResult.error) }}
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
