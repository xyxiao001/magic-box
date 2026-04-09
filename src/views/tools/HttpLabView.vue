<script setup lang="ts">
import { computed, ref } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  buildHttpRequestConfig,
  formatByteSize,
  formatHttpError,
  formatResponseBody,
  formatResponseHeaders,
  type HttpMethod,
} from '@/lib/http'
import { formatJson } from '@/lib/json-tool'

interface HttpTemplate {
  label: string
  summary: string
  method: HttpMethod
  url: string
  headers: string
  body: string
}

const method = ref<HttpMethod>('GET')
const requestUrl = ref('https://jsonplaceholder.typicode.com/users/1')
const headersInput = ref('Accept: application/json')
const bodyInput = ref('')
const isLoading = ref(false)
const statusMessage = ref('准备发起请求')
const statusTone = ref<'neutral' | 'success' | 'danger'>('neutral')
const responseStatus = ref('未发起')
const responseDuration = ref('—')
const responseType = ref('—')
const responseSize = ref('—')
const responseHeaders = ref('')
const responseBody = ref('')

const httpTemplates: HttpTemplate[] = [
  {
    label: '获取用户',
    summary: '最常见的 GET 调试场景，适合验证 URL 和响应结构。',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/users/1',
    headers: 'Accept: application/json',
    body: '',
  },
  {
    label: '创建文章',
    summary: '发送 JSON Body，适合验证 Content-Type 和响应回显。',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: 'Accept: application/json\nContent-Type: application/json',
    body: `{
  "title": "ship http lab",
  "body": "Keep building Magic Box.",
  "userId": 1
}`,
  },
  {
    label: '更新待办',
    summary: '模拟 PUT 更新，检查接口是否正确接收请求体。',
    method: 'PUT',
    url: 'https://jsonplaceholder.typicode.com/todos/1',
    headers: 'Accept: application/json\nContent-Type: application/json',
    body: `{
  "id": 1,
  "title": "Polish HTTP Lab",
  "completed": true,
  "userId": 1
}`,
  },
  {
    label: '删除资源',
    summary: '快速验证 DELETE 请求是否联通以及状态码展示。',
    method: 'DELETE',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: 'Accept: application/json',
    body: '',
  },
]

const supportsRequestBody = computed(
  () => method.value === 'POST' || method.value === 'PUT'
)
const bodyPlaceholder = computed(() =>
  supportsRequestBody.value
    ? '{\n  "name": "Magic Box"\n}'
    : '当前 Method 默认不发送请求体'
)

function applyStatus(message: string, tone: 'neutral' | 'success' | 'danger') {
  statusMessage.value = message
  statusTone.value = tone
}

function resetResponse() {
  responseStatus.value = '未发起'
  responseDuration.value = '—'
  responseType.value = '—'
  responseSize.value = '—'
  responseHeaders.value = ''
  responseBody.value = ''
}

function applyTemplate(template: HttpTemplate) {
  method.value = template.method
  requestUrl.value = template.url
  headersInput.value = template.headers
  bodyInput.value = template.body
  applyStatus(`已应用模板：${template.label}`, 'neutral')
  resetResponse()
}

function formatRequestBody() {
  const raw = bodyInput.value.trim()

  if (!raw) {
    applyStatus('当前没有可格式化的请求体', 'neutral')
    return
  }

  const result = formatJson(bodyInput.value)

  if (!result.ok || !result.value) {
    applyStatus(result.error ?? '请求体不是有效 JSON', 'danger')
    return
  }

  bodyInput.value = result.value
  applyStatus('请求体已格式化', 'success')
}

async function copyValue(value: string, label: string) {
  if (!value) {
    applyStatus(`当前没有可复制的${label}`, 'danger')
    return
  }

  const success = await copyToClipboard(value)
  applyStatus(success ? `${label}已复制` : '当前环境不支持复制', success ? 'neutral' : 'danger')
}

async function sendRequest() {
  const url = requestUrl.value.trim()

  if (!url) {
    applyStatus('请输入请求 URL', 'danger')
    return
  }

  const config = buildHttpRequestConfig(method.value, headersInput.value, bodyInput.value)

  if (!config.ok) {
    applyStatus(config.error, 'danger')
    return
  }

  resetResponse()
  isLoading.value = true
  applyStatus('请求发送中...', 'neutral')

  const startedAt = performance.now()

  try {
    const response = await fetch(url, config.value.init)
    const rawBody = await response.text()
    const duration = Math.round(performance.now() - startedAt)
    const contentType = response.headers.get('content-type')

    responseStatus.value = `${response.status} ${response.statusText}`.trim()
    responseDuration.value = `${duration} ms`
    responseType.value = contentType ?? '未知'
    responseSize.value = formatByteSize(new TextEncoder().encode(rawBody).length)
    responseHeaders.value = formatResponseHeaders(response.headers)
    responseBody.value = formatResponseBody(rawBody, contentType)

    applyStatus(response.ok ? '请求完成' : '请求返回错误状态码', response.ok ? 'success' : 'danger')
  } catch (error) {
    responseStatus.value = '请求失败'
    responseDuration.value = `${Math.round(performance.now() - startedAt)} ms`
    applyStatus(formatHttpError(error), 'danger')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="tool-page tool-page-http">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">请求构造</h2>
            <p class="meta-hint">先把最常用的联调路径做顺：方法、地址、请求头和原始 JSON。</p>
          </div>
          <span class="workspace-chip">Fetch API</span>
        </div>

        <div class="http-composer-grid">
          <label class="field-row http-method-field">
            <span class="field-label">Method</span>
            <select v-model="method" class="select-input">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </label>

          <label class="field-row">
            <span class="field-label">Request URL</span>
            <input
              v-model="requestUrl"
              class="text-input"
              type="url"
              placeholder="https://api.example.com/users/1"
            />
          </label>
        </div>

        <label class="field-row">
          <span class="field-label">Headers</span>
          <textarea
            v-model="headersInput"
            class="text-area text-area-compact"
            spellcheck="false"
            placeholder="Accept: application/json"
          />
        </label>

        <label class="field-row">
          <span class="field-label">Raw JSON Body</span>
          <textarea
            v-model="bodyInput"
            class="text-area http-body-input"
            spellcheck="false"
            :placeholder="bodyPlaceholder"
          />
        </label>

        <p class="meta-hint">
          {{
            supportsRequestBody
              ? 'POST / PUT 会发送当前请求体；如果像 JSON，会自动补上 Content-Type。'
              : 'GET / DELETE 默认不发送请求体，但仍可提前准备模板，切换 Method 后直接使用。'
          }}
        </p>

        <div class="input-toolbar">
          <button
            type="button"
            class="solid-button"
            :disabled="isLoading"
            @click="sendRequest"
          >
            {{ isLoading ? '请求中...' : '发送请求' }}
          </button>
          <button type="button" class="ghost-button" @click="formatRequestBody">
            格式化 Body
          </button>
          <button type="button" class="ghost-button" @click="resetResponse">
            清空响应
          </button>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">请求模板</span>
            <span class="meta-hint">公共示例优先选用带 CORS 的演示接口。</span>
          </div>

          <div class="http-template-list">
            <button
              v-for="template in httpTemplates"
              :key="template.label"
              type="button"
              class="http-template-card"
              @click="applyTemplate(template)"
            >
              <div class="http-template-top">
                <span class="http-template-method" :data-method="template.method">
                  {{ template.method }}
                </span>
                <span class="http-template-action">使用模板</span>
              </div>
              <strong class="http-template-title">{{ template.label }}</strong>
              <p class="http-template-summary">{{ template.summary }}</p>
              <code class="http-template-url">{{ template.url }}</code>
            </button>
          </div>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">响应结果</h2>
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
          <span class="workspace-chip">{{ method }}</span>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">响应摘要</span>
            <span class="meta-hint">快速确认状态码、耗时和返回类型。</span>
          </div>

          <div class="data-list">
            <div class="data-row">
              <div>
                <span class="result-label">Status</span>
                <strong class="result-value">{{ responseStatus }}</strong>
              </div>
              <div>
                <span class="result-label">Duration</span>
                <strong class="result-value">{{ responseDuration }}</strong>
              </div>
            </div>

            <div class="data-row">
              <div>
                <span class="result-label">Content-Type</span>
                <strong class="result-value">{{ responseType }}</strong>
              </div>
              <div>
                <span class="result-label">Size</span>
                <strong class="result-value">{{ responseSize }}</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Response Body</span>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!responseBody"
              @click="copyValue(responseBody, '响应体')"
            >
              复制
            </button>
          </div>

          <textarea
            :value="responseBody"
            class="text-area http-response-body"
            readonly
            placeholder="响应体会显示在这里"
          />
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Response Headers</span>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!responseHeaders"
              @click="copyValue(responseHeaders, '响应头')"
            >
              复制
            </button>
          </div>

          <textarea
            :value="responseHeaders"
            class="text-area text-area-compact"
            readonly
            placeholder="响应头会显示在这里"
          />
        </section>
      </section>
    </div>
  </section>
</template>
