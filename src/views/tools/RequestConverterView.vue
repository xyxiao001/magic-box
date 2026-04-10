<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  buildAxiosSnippet,
  buildFetchSnippet,
  buildNodeFetchSnippet,
  buildRequestConfigJson,
  parseCurlRequest,
} from '@/lib/request-converter'

type OutputTab = 'structured' | 'fetch' | 'axios' | 'node-fetch'

const inputStorageKey = 'magic-box.request-converter.curl'
const tabStorageKey = 'magic-box.request-converter.tab'

const curlInput = ref(
  localStorage.getItem(inputStorageKey) ||
    "curl 'https://api.example.com/v1/ping' -H 'Accept: application/json'"
)
const activeTab = ref<OutputTab>((localStorage.getItem(tabStorageKey) as OutputTab) || 'structured')
const toastMessage = ref('')

const parsed = computed(() => parseCurlRequest(curlInput.value))
const fetchSnippet = computed(() => (parsed.value.ok ? buildFetchSnippet(parsed.value) : ''))
const axiosSnippet = computed(() => (parsed.value.ok ? buildAxiosSnippet(parsed.value) : ''))
const nodeFetchSnippet = computed(() => (parsed.value.ok ? buildNodeFetchSnippet(parsed.value) : ''))
const configJson = computed(() => (parsed.value.ok ? buildRequestConfigJson(parsed.value) : ''))

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  toastMessage.value = success ? `${label}已复制` : '当前环境不支持复制'
  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

watch(curlInput, (value) => {
  localStorage.setItem(inputStorageKey, value)
})

watch(activeTab, (value) => {
  localStorage.setItem(tabStorageKey, value)
})
</script>

<template>
  <section class="tool-page tool-page-request">
    <div class="tool-page-layout wide-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">cURL 输入</h2>
            <p class="meta-hint">粘贴 cURL 后自动解析，并生成 fetch / axios / node fetch 片段。</p>
          </div>
          <span class="workspace-chip">{{ parsed.ok ? parsed.method : '—' }}</span>
        </div>

        <label class="field-row">
          <span class="field-label">cURL</span>
          <textarea
            v-model="curlInput"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="粘贴 curl 命令，例如：curl -X POST https://... -H 'Content-Type: application/json' -d '{...}'"
          />
        </label>

        <p class="helper-text" :class="{ 'helper-text-danger': !parsed.ok }">
          {{ parsed.ok ? '解析成功，可在右侧切换输出格式并复制。' : parsed.error }}
        </p>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">输出</h2>
            <p class="meta-hint">先看结构化视图确认 method/url/header/body，再复制代码片段。</p>
          </div>
        </div>

        <div class="tab-row">
          <button
            type="button"
            class="tab-button"
            :data-active="activeTab === 'structured'"
            @click="activeTab = 'structured'"
          >
            结构化
          </button>
          <button
            type="button"
            class="tab-button"
            :data-active="activeTab === 'fetch'"
            @click="activeTab = 'fetch'"
          >
            fetch
          </button>
          <button
            type="button"
            class="tab-button"
            :data-active="activeTab === 'axios'"
            @click="activeTab = 'axios'"
          >
            axios
          </button>
          <button
            type="button"
            class="tab-button"
            :data-active="activeTab === 'node-fetch'"
            @click="activeTab = 'node-fetch'"
          >
            Node fetch
          </button>
        </div>

        <section v-if="activeTab === 'structured'" class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Request Config</span>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!parsed.ok"
              @click="copyValue(configJson, '配置 JSON')"
            >
              复制
            </button>
          </div>
          <textarea :value="configJson" class="text-area text-area-full" readonly placeholder="解析结果会显示在这里" />
        </section>

        <section v-else class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">代码片段</span>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!parsed.ok"
              @click="
                copyValue(
                  activeTab === 'fetch'
                    ? fetchSnippet
                    : activeTab === 'axios'
                      ? axiosSnippet
                      : nodeFetchSnippet,
                  '代码'
                )
              "
            >
              复制
            </button>
          </div>
          <textarea
            :value="activeTab === 'fetch' ? fetchSnippet : activeTab === 'axios' ? axiosSnippet : nodeFetchSnippet"
            class="text-area text-area-full"
            readonly
            placeholder="解析成功后，这里会生成代码"
          />
        </section>
      </section>
    </div>

    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>
