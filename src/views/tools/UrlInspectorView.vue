<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ErrorBanner from '@/components/toolkit/ErrorBanner.vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage, writeStorage } from '@/lib/storage'
import {
  buildUrlFromInspectorState,
  buildUrlInspectorQueryJson,
  createUrlInspectorQueryEntry,
  parseUrlInspectorInput,
  type UrlInspectorQueryEntry,
} from '@/lib/url-inspector'

interface UrlTemplate {
  label: string
  summary: string
  value: string
}

const urlInputDomain = 'tool-history:url-inspector:input'

const urlTemplates: UrlTemplate[] = [
  {
    label: 'HTTP 请求',
    summary: '适合和 HTTP Lab 联动，快速检查 query、hash 与路径。',
    value: 'https://api.magic-box.dev/users?tab=request&traceId=req-20260411#response',
  },
  {
    label: 'OAuth 回调',
    summary: '适合排查 redirect_uri、code、state 等常见登录回调参数。',
    value:
      'https://app.magic-box.dev/callback?code=auth-code-123&state=xyz&redirect_uri=https%3A%2F%2Fmagic-box.dev%2Fdone',
  },
  {
    label: '签名链接',
    summary: '适合查看 expires、token、signature 等鉴权参数。',
    value:
      'https://download.magic-box.dev/archive.zip?expires=1712534400&token=abc123&signature=sha256%3Adeadbeef',
  },
  {
    label: '埋点链接',
    summary: '适合检查 utm_source、utm_medium、utm_campaign 等营销参数。',
    value:
      'https://magic-box.dev/pricing?utm_source=newsletter&utm_medium=email&utm_campaign=spring-launch',
  },
]

const urlInput = ref(
  readStorage(urlInputDomain, urlTemplates[0]?.value ?? '', {
    parseLegacy: (raw) => raw,
  })
)
const toastMessage = ref('')
const protocol = ref('https')
const hostname = ref('')
const port = ref('')
const pathname = ref('/')
const hash = ref('')
const queryEntries = ref<UrlInspectorQueryEntry[]>([])

const parsed = computed(() => parseUrlInspectorInput(urlInput.value))
const queryJson = computed(() => buildUrlInspectorQueryJson(queryEntries.value))
const decodedHints = computed(() => {
  if (!parsed.value.ok) {
    return []
  }

  const hints: string[] = []

  if (parsed.value.pathname !== parsed.value.decodedPathname) {
    hints.push(`Path 解码后：${parsed.value.decodedPathname}`)
  }

  if (parsed.value.hash && parsed.value.hash !== parsed.value.decodedHash) {
    hints.push(`Hash 解码后：${parsed.value.decodedHash}`)
  }

  return hints
})

function syncEditableState() {
  if (!parsed.value.ok) {
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
  queryEntries.value = parsed.value.queryEntries.map((entry) => ({ ...entry }))
}

watch(parsed, syncEditableState, { immediate: true })

watch(urlInput, (value) => {
  writeStorage(urlInputDomain, value)
})

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  toastMessage.value = success ? `${label}已复制` : '当前环境不支持复制'

  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

function applyTemplate(template: UrlTemplate) {
  urlInput.value = template.value
}

function addQueryEntry() {
  queryEntries.value = [...queryEntries.value, createUrlInspectorQueryEntry()]
}

function removeQueryEntry(id: string) {
  queryEntries.value = queryEntries.value.filter((entry) => entry.id !== id)
}

function rebuildUrl() {
  if (!parsed.value.ok) {
    return
  }

  urlInput.value = buildUrlFromInspectorState({
    protocol: protocol.value,
    hostname: hostname.value,
    port: port.value,
    pathname: pathname.value,
    hash: hash.value,
    queryEntries: queryEntries.value,
  })
}

function clearAll() {
  urlInput.value = ''
}
</script>

<template>
  <ToolPageLayout wide class="url-inspector-page">
    <template #editor>
      <ToolPaneShell
        title="URL 输入"
        subtitle="粘贴完整链接后自动拆解 protocol、host、path、query、hash。"
        :badge="parsed.ok ? parsed.protocol.toUpperCase() : 'URL'"
      >
        <label class="field-row">
          <span class="field-label">完整 URL</span>
          <textarea
            v-model="urlInput"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="https://example.com/path?foo=bar#hash"
          />
        </label>

        <ToolActionBar>
          <button type="button" class="solid-button" :disabled="!parsed.ok" @click="rebuildUrl">
            重新生成 URL
          </button>
          <button type="button" class="ghost-button" :disabled="!parsed.ok" @click="copyValue(parsed.href, '完整 URL')">
            复制 URL
          </button>
          <button type="button" class="ghost-button" @click="clearAll">清空</button>
        </ToolActionBar>

        <ErrorBanner
          v-if="!parsed.ok"
          title="解析失败"
          :message="parsed.error || '请输入合法 URL'"
          hint="首版要求包含合法协议和主机名，例如 https://magic-box.dev/path?a=1"
        />

        <ToolPanel v-else title="模板">
          <div class="url-template-list">
            <button
              v-for="template in urlTemplates"
              :key="template.label"
              type="button"
              class="url-template-card"
              @click="applyTemplate(template)"
            >
              <div class="url-template-top">
                <strong class="url-template-title">{{ template.label }}</strong>
                <span class="url-template-action">使用模板</span>
              </div>
              <p class="url-template-summary">{{ template.summary }}</p>
              <code class="url-template-code">{{ template.value }}</code>
            </button>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>

    <template #viewer>
      <ToolPaneShell title="解析结果" subtitle="先确认基础字段，再按需改 query 参数并重建 URL。">
        <div v-if="parsed.ok" class="url-summary-grid">
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

        <ToolPanel v-if="parsed.ok" title="Query 参数" :subtitle="`${queryEntries.length} 个参数，可直接编辑后重建 URL。`">
          <template #actions>
            <button type="button" class="ghost-button small-button" @click="addQueryEntry">新增参数</button>
          </template>

          <div v-if="queryEntries.length" class="url-query-list">
            <article v-for="entry in queryEntries" :key="entry.id" class="url-query-row">
              <input v-model="entry.key" class="text-input" type="text" placeholder="key" />
              <input v-model="entry.value" class="text-input" type="text" placeholder="value" />
              <span v-if="entry.encodedKey || entry.encodedValue" class="workspace-chip">已编码</span>
              <button type="button" class="ghost-button small-button" @click="removeQueryEntry(entry.id)">
                删除
              </button>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>当前没有 query 参数，你可以新增参数后重新生成 URL。</p>
          </div>
        </ToolPanel>

        <ToolPanel v-if="parsed.ok" title="重建后的 URL" subtitle="编辑 query 后点击重新生成 URL，可直接复制到其他工具继续使用。">
          <template #actions>
            <button type="button" class="ghost-button small-button" @click="copyValue(parsed.href, '重建 URL')">
              复制
            </button>
          </template>

          <textarea :value="parsed.href" class="text-area text-area-full" readonly />
        </ToolPanel>

        <ToolPanel
          v-if="parsed.ok"
          title="相关工具"
          subtitle="URL Inspector 适合作为接口联调链路中的拆解与回填中间站。"
        >
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
  </ToolPageLayout>

  <section>
    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>

<style scoped>
.url-template-list,
.url-related-list {
  display: grid;
  gap: 0.875rem;
}

.url-template-card,
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

.url-template-card strong,
.url-related-card strong {
  color: var(--text);
}

.url-template-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.url-template-summary,
.url-related-card p {
  margin: 0;
  color: var(--muted);
}

.url-template-code {
  overflow-wrap: anywhere;
  color: var(--text);
}

.url-template-action {
  color: var(--accent);
  font-size: 0.875rem;
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
