<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ErrorBanner from '@/components/toolkit/ErrorBanner.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage, writeStorage } from '@/lib/storage'
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
const inputDomain = 'tool-history:request-converter:curl'
const tabDomain = 'tool-history:request-converter:tab'
const defaultCurlInput = "curl 'https://api.example.com/v1/ping' -H 'Accept: application/json'"

function parseStoredTab(raw: string) {
  if (raw === 'structured' || raw === 'fetch' || raw === 'axios' || raw === 'node-fetch') {
    return raw
  }
}

const curlInput = ref(
  readStorage(inputDomain, defaultCurlInput, {
    legacyKeys: [inputStorageKey],
    parseLegacy: (raw) => raw,
  })
)
const activeTab = ref<OutputTab>(
  readStorage<OutputTab>(tabDomain, 'structured', {
    legacyKeys: [tabStorageKey],
    parseLegacy: (raw) => parseStoredTab(raw),
  })
)
const toastMessage = ref('')

const parsed = computed(() => parseCurlRequest(curlInput.value))
const fetchSnippet = computed(() => (parsed.value.ok ? buildFetchSnippet(parsed.value) : ''))
const axiosSnippet = computed(() => (parsed.value.ok ? buildAxiosSnippet(parsed.value) : ''))
const nodeFetchSnippet = computed(() => (parsed.value.ok ? buildNodeFetchSnippet(parsed.value) : ''))
const configJson = computed(() => (parsed.value.ok ? buildRequestConfigJson(parsed.value) : ''))
const activeOutput = computed(() => {
  if (activeTab.value === 'fetch') {
    return fetchSnippet.value
  }

  if (activeTab.value === 'axios') {
    return axiosSnippet.value
  }

  return nodeFetchSnippet.value
})

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  toastMessage.value = success ? `${label}已复制` : '当前环境不支持复制'
  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

watch(curlInput, (value) => {
  writeStorage(inputDomain, value)
})

watch(activeTab, (value) => {
  writeStorage(tabDomain, value)
})
</script>

<template>
  <ToolPageLayout wide>
    <template #editor>
      <ToolPanel
        title="cURL 输入"
        subtitle="粘贴 cURL 后自动解析，并生成 fetch / axios / node fetch 片段。"
        :badge="parsed.ok ? parsed.method : '—'"
      >
        <label class="field-row">
          <span class="field-label">cURL</span>
          <textarea
            v-model="curlInput"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="粘贴 curl 命令，例如：curl -X POST https://... -H 'Content-Type: application/json' -d '{...}'"
          />
        </label>

        <p v-if="parsed.ok" class="helper-text">解析成功，可在右侧切换输出格式并复制。</p>
        <ErrorBanner
          v-else
          title="解析失败"
          :message="parsed.error || '请输入合法的 cURL 命令'"
          hint="请检查引号、Header 和 body 参数是否完整。"
        />
      </ToolPanel>
    </template>

    <template #viewer>
      <ToolPanel title="输出" subtitle="先看结构化视图确认 method、url、header、body，再复制代码片段。">
        <ToolActionBar>
          <button
            type="button"
            class="tab-button"
            :data-active="activeTab === 'structured'"
            @click="activeTab = 'structured'"
          >
            结构化
          </button>
          <button type="button" class="tab-button" :data-active="activeTab === 'fetch'" @click="activeTab = 'fetch'">
            fetch
          </button>
          <button type="button" class="tab-button" :data-active="activeTab === 'axios'" @click="activeTab = 'axios'">
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
        </ToolActionBar>

        <ToolPanel v-if="activeTab === 'structured'" title="Request Config">
          <template #actions>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!parsed.ok"
              @click="copyValue(configJson, '配置 JSON')"
            >
              复制
            </button>
          </template>

          <textarea :value="configJson" class="text-area text-area-full" readonly placeholder="解析结果会显示在这里" />
        </ToolPanel>

        <ToolPanel v-else title="代码片段">
          <template #actions>
            <button type="button" class="ghost-button small-button" :disabled="!parsed.ok" @click="copyValue(activeOutput, '代码')">
              复制
            </button>
          </template>

          <textarea :value="activeOutput" class="text-area text-area-full" readonly placeholder="解析成功后，这里会生成代码" />
        </ToolPanel>
      </ToolPanel>
    </template>
  </ToolPageLayout>

  <section>
    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>
