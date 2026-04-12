<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDraft } from '@/tool-runtime/composables/useToolDraft'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolHistory } from '@/tool-runtime/composables/useToolHistory'
import { useToolSamples } from '@/tool-runtime/composables/useToolSamples'
import { useToolShare } from '@/tool-runtime/composables/useToolShare'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolSamplePanel from '@/tool-runtime/scaffolds/ToolSamplePanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import { buildUrlFromInspectorState, createUrlInspectorQueryEntry, type UrlInspectorQueryEntry } from './logic'
import {
  buildUrlInspectorHistoryLabel,
  cloneUrlInspectorEntries,
  type UrlInspectorInput,
  type UrlInspectorOutput,
  urlInspectorRuntimeModule,
} from './module'

const state = useToolState<UrlInspectorInput, UrlInspectorOutput>(urlInspectorRuntimeModule)
const draft = useToolDraft(urlInspectorRuntimeModule, state, {
  legacyKeys: ['tool-history:url-inspector:input'],
  parseLegacy: (raw) => ({
    urlInput: raw,
  }),
})
const history = useToolHistory(urlInspectorRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildUrlInspectorHistoryLabel(output) : 'URL Inspector 快照',
    description: output?.parsed.href ?? '最近一次 URL 快照',
  }),
})
const { run } = useToolExecution(urlInspectorRuntimeModule, state)
const samples = useToolSamples(urlInspectorRuntimeModule, state)
const share = useToolShare(urlInspectorRuntimeModule, state)
const { success: showSuccessMessage, error: showErrorMessage, info: showInfoMessage } = useMessage()

const protocol = ref('https')
const hostname = ref('')
const port = ref('')
const pathname = ref('/')
const hash = ref('')
const queryEntries = ref<UrlInspectorQueryEntry[]>([])

const parsed = computed(() => state.output.value?.parsed)
const queryJson = computed(() => state.output.value?.queryJson ?? '')
const decodedHints = computed(() => state.output.value?.decodedHints ?? [])

share.restoreSharedState()

function syncEditableState() {
  if (!parsed.value) {
    queryEntries.value = []
    hostname.value = ''
    port.value = ''
    pathname.value = '/'
    hash.value = ''
    return
  }

  protocol.value = parsed.value.protocol
  hostname.value = parsed.value.hostname
  port.value = parsed.value.port
  pathname.value = parsed.value.pathname
  hash.value = parsed.value.hash
  queryEntries.value = cloneUrlInspectorEntries(parsed.value.queryEntries)
}

watch(parsed, syncEditableState, { immediate: true })

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

async function copyValue(value: string, label: string) {
  const copied = await copyToClipboard(value)

  if (copied) {
    showSuccessMessage(`${label}已复制`)
    return
  }

  showErrorMessage('当前环境不支持复制')
}

function addQueryEntry() {
  queryEntries.value = [...queryEntries.value, createUrlInspectorQueryEntry()]
}

function removeQueryEntry(id: string) {
  queryEntries.value = queryEntries.value.filter((entry) => entry.id !== id)
}

function rebuildUrl() {
  if (!parsed.value) {
    return
  }

  state.input.value.urlInput = buildUrlFromInspectorState({
    protocol: protocol.value,
    hostname: hostname.value,
    port: port.value,
    pathname: pathname.value,
    hash: hash.value,
    queryEntries: queryEntries.value,
  })
  showInfoMessage('已根据当前编辑态重建 URL')
}

function clearAll() {
  draft.clearDraft()
  state.input.value.urlInput = ''
  state.output.value = null
  state.error.value = null
}

function saveSnapshot() {
  if (!parsed.value) {
    return
  }

  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

onMounted(() => {
  void run()
})
</script>

<template>
  <ToolScaffold :meta="urlInspectorRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #input>
      <ToolPaneShell
        title="URL 输入"
        subtitle="粘贴完整链接后自动拆解 protocol、host、path、query、hash。"
        :badge="parsed ? parsed.protocol.toUpperCase() : 'URL'"
      >
        <label class="field-row">
          <span class="field-label">完整 URL</span>
          <textarea
            v-model="state.input.value.urlInput"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="https://example.com/path?foo=bar#hash"
          />
        </label>

        <ToolActionBar>
          <button type="button" class="solid-button" :disabled="!parsed" @click="rebuildUrl">重新生成 URL</button>
          <button type="button" class="ghost-button" :disabled="!parsed" @click="copyValue(parsed?.href ?? '', '完整 URL')">
            复制 URL
          </button>
          <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
          <button type="button" class="ghost-button" :disabled="!parsed" @click="saveSnapshot">保存快照</button>
          <button type="button" class="ghost-button" @click="clearAll">清空</button>
        </ToolActionBar>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="(sampleId) => samples.applySample(samples.samples.value.find((sample) => sample.id === sampleId)!)"
        />
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的 URL 解析状态。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<UrlInspectorInput, UrlInspectorOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="解析结果" subtitle="先确认基础字段，再按需改 query 参数并重建 URL。">
        <div v-if="parsed" class="url-summary-grid">
          <ResultCard title="基础信息" :copy-value="parsed.origin" copy-label="复制 Origin">
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">Protocol</span>
                  <strong class="result-value">{{ parsed.protocol }}</strong>
                </div>
                <div>
                  <span class="result-label">Host</span>
                  <strong class="result-value">{{ parsed.host }}</strong>
                </div>
              </article>
              <article class="data-row">
                <div>
                  <span class="result-label">Pathname</span>
                  <strong class="result-value">{{ parsed.pathname }}</strong>
                </div>
                <div>
                  <span class="result-label">Hash</span>
                  <strong class="result-value">{{ parsed.hash || '—' }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>

          <ResultCard
            title="解码提示"
            :subtitle="parsed.hasEncodedSegments ? '当前 URL 包含已编码片段' : '当前 URL 没有检测到已编码片段'"
            :copy-value="queryJson"
            copy-label="复制 Query JSON"
            :tone="parsed.hasEncodedSegments ? 'success' : 'neutral'"
          >
            <div v-if="decodedHints.length" class="url-hint-list">
              <p v-for="hint in decodedHints" :key="hint">{{ hint }}</p>
            </div>
            <p v-else class="meta-hint">如果 query 或 path 中包含 `%xx` 编码，这里会展示解码后的提示。</p>
          </ResultCard>
        </div>

        <ToolPanel v-if="parsed" title="Query 参数" :subtitle="`${queryEntries.length} 个参数，可直接编辑后重建 URL。`">
          <template #actions>
            <button type="button" class="ghost-button small-button" @click="addQueryEntry">新增参数</button>
          </template>

          <div v-if="queryEntries.length" class="url-query-list">
            <article v-for="entry in queryEntries" :key="entry.id" class="url-query-row">
              <input v-model="entry.key" class="text-input" type="text" placeholder="key" />
              <input v-model="entry.value" class="text-input" type="text" placeholder="value" />
              <span v-if="entry.encodedKey || entry.encodedValue" class="workspace-chip">已编码</span>
              <button type="button" class="ghost-button small-button" @click="removeQueryEntry(entry.id)">删除</button>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>当前没有 query 参数，你可以新增参数后重新生成 URL。</p>
          </div>
        </ToolPanel>

        <ToolPanel v-if="parsed" title="重建后的 URL" subtitle="编辑 query 后点击重新生成 URL，可直接复制到其他工具继续使用。">
          <template #actions>
            <button type="button" class="ghost-button small-button" @click="copyValue(parsed.href, '重建 URL')">复制</button>
          </template>

          <textarea :value="parsed.href" class="text-area text-area-full" readonly />
        </ToolPanel>

        <ToolPanel v-if="parsed" title="相关工具" subtitle="URL Inspector 适合作为接口联调链路中的拆解与回填中间站。">
          <div class="url-related-list">
            <router-link class="url-related-card" to="/tools/http-lab">
              <strong>HTTP Lab</strong>
              <p>发请求前先拆 URL，检查 query、hash 和 path 是否符合预期。</p>
            </router-link>
            <router-link class="url-related-card" to="/tools/request-converter">
              <strong>Request Converter</strong>
              <p>解析 cURL 后继续编辑 URL，再回到请求代码生成视图。</p>
            </router-link>
            <router-link class="url-related-card" to="/tools/header-cookie-lab">
              <strong>Header &amp; Cookie Lab</strong>
              <p>适合一起排查 callback、redirect、signed url 和鉴权问题。</p>
            </router-link>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>

<style scoped>
.url-related-list {
  display: grid;
  gap: 0.875rem;
}

.url-related-card {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--surface-card-border);
  background: var(--surface-card-bg);
  text-align: left;
  color: var(--text);
}

.url-related-card strong {
  color: var(--text);
}

.url-related-card p {
  margin: 0;
  color: var(--muted);
}

.url-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.875rem;
}

.url-hint-list {
  display: grid;
  gap: 0.375rem;
}

.url-hint-list p {
  margin: 0;
}

.url-query-list {
  display: grid;
  gap: 0.75rem;
}

.url-query-row {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) auto auto;
  gap: 0.75rem;
  align-items: center;
}

.url-related-card {
  text-decoration: none;
}

@media (max-width: 900px) {
  .url-summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .url-query-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
