<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  buildCanonicalString,
  compareSignature,
  computeHmacSha256,
  type CanonicalOptions,
  type HmacOutputFormat,
} from '@/lib/hmac-tool'

type Mode = 'basic' | 'request'

const stateKey = 'magic-box.hmac-signer.state'

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem(stateKey) || '{}') as Partial<{
      mode: Mode
      secret: string
      message: string
      format: HmacOutputFormat
      target: string
      options: CanonicalOptions
      request: {
        method: string
        path: string
        query: string
        timestamp: string
        nonce: string
        body: string
      }
      persistSecret: boolean
    }>
  } catch {
    return {}
  }
})()

const mode = ref<Mode>(saved.mode || 'basic')
const persistSecret = ref(Boolean(saved.persistSecret))
const secret = ref(persistSecret.value ? saved.secret || '' : '')
const message = ref(saved.message || 'The quick brown fox jumps over the lazy dog')
const outputFormat = ref<HmacOutputFormat>(saved.format || 'hex')
const targetSignature = ref(saved.target || '')
const showSecret = ref(false)
const toastMessage = ref('')

const canonicalOptions = ref<CanonicalOptions>({
  sortQuery: saved.options?.sortQuery ?? true,
  filterEmpty: saved.options?.filterEmpty ?? true,
  delimiter: saved.options?.delimiter ?? 'newline',
})

const requestInput = ref({
  method: saved.request?.method || 'POST',
  path: saved.request?.path || '/v1/hooks',
  query: saved.request?.query || 'b=2&a=1',
  timestamp: saved.request?.timestamp || String(Math.floor(Date.now() / 1000)),
  nonce: saved.request?.nonce || 'nonce-1',
  body: saved.request?.body || '{"id":1}',
})

const canonicalMessage = computed(() =>
  buildCanonicalString(requestInput.value, canonicalOptions.value)
)

const effectiveMessage = computed(() => (mode.value === 'request' ? canonicalMessage.value : message.value))

const signatureHex = ref('')
const signatureBase64 = ref('')
const statusMessage = ref('')

const compareHex = computed(() => compareSignature(targetSignature.value, outputFormat.value === 'hex' ? signatureHex.value : signatureBase64.value))

async function recompute() {
  statusMessage.value = ''

  if (!secret.value.trim()) {
    signatureHex.value = ''
    signatureBase64.value = ''
    statusMessage.value = '请输入 secret'
    return
  }

  if (!effectiveMessage.value) {
    signatureHex.value = ''
    signatureBase64.value = ''
    statusMessage.value = '请输入签名原文'
    return
  }

  try {
    signatureHex.value = await computeHmacSha256(secret.value, effectiveMessage.value, 'hex')
    signatureBase64.value = await computeHmacSha256(secret.value, effectiveMessage.value, 'base64')
  } catch {
    statusMessage.value = '签名计算失败，请确认环境支持 Web Crypto'
  }
}

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  toastMessage.value = success ? `${label}已复制` : '当前环境不支持复制'
  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

watch([mode, secret, message, outputFormat, targetSignature, canonicalOptions, requestInput, persistSecret], () => {
  localStorage.setItem(
    stateKey,
    JSON.stringify({
      mode: mode.value,
      persistSecret: persistSecret.value,
      secret: persistSecret.value ? secret.value : '',
      message: message.value,
      format: outputFormat.value,
      target: targetSignature.value,
      options: canonicalOptions.value,
      request: requestInput.value,
    })
  )

  void recompute()
}, { deep: true })

void recompute()
</script>

<template>
  <section class="tool-page tool-page-hmac">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">输入</h2>
            <p class="meta-hint">首版只支持 HMAC-SHA256，帮助你对照 canonical string 与签名结果。</p>
          </div>
          <span class="workspace-chip">HMAC-SHA256</span>
        </div>

        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="mode === 'basic'" @click="mode = 'basic'">
            基础模式
          </button>
          <button type="button" class="tab-button" :data-active="mode === 'request'" @click="mode = 'request'">
            请求模式
          </button>
        </div>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">保存 secret</span>
            <select v-model="persistSecret" class="select-input">
              <option :value="false">否</option>
              <option :value="true">是</option>
            </select>
          </label>
          <label class="field-row">
            <span class="field-label">显示</span>
            <select v-model="showSecret" class="select-input">
              <option :value="false">隐藏</option>
              <option :value="true">显示</option>
            </select>
          </label>
        </div>

        <label class="field-row">
          <span class="field-label">Secret</span>
          <input v-model="secret" class="text-input" :type="showSecret ? 'text' : 'password'" placeholder="输入签名密钥" />
        </label>

        <label v-if="mode === 'basic'" class="field-row">
          <span class="field-label">Message</span>
          <textarea v-model="message" class="text-area text-area-compact" spellcheck="false" />
        </label>

        <section v-else class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">请求要素</span>
            <span class="meta-hint">用通用规则生成 canonical string，再计算签名。</span>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">Method</span>
              <input v-model="requestInput.method" class="text-input" type="text" />
            </label>
            <label class="field-row">
              <span class="field-label">Path</span>
              <input v-model="requestInput.path" class="text-input" type="text" />
            </label>
          </div>

          <label class="field-row">
            <span class="field-label">Query</span>
            <input v-model="requestInput.query" class="text-input" type="text" placeholder="a=1&b=2" />
          </label>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">Timestamp</span>
              <input v-model="requestInput.timestamp" class="text-input" type="text" />
            </label>
            <label class="field-row">
              <span class="field-label">Nonce</span>
              <input v-model="requestInput.nonce" class="text-input" type="text" />
            </label>
          </div>

          <label class="field-row">
            <span class="field-label">Body</span>
            <textarea v-model="requestInput.body" class="text-area text-area-compact" spellcheck="false" />
          </label>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">Query 排序</span>
              <select v-model="canonicalOptions.sortQuery" class="select-input">
                <option :value="true">开启</option>
                <option :value="false">关闭</option>
              </select>
            </label>
            <label class="field-row">
              <span class="field-label">过滤空值</span>
              <select v-model="canonicalOptions.filterEmpty" class="select-input">
                <option :value="true">开启</option>
                <option :value="false">关闭</option>
              </select>
            </label>
          </div>

          <label class="field-row">
            <span class="field-label">分隔符</span>
            <select v-model="canonicalOptions.delimiter" class="select-input">
              <option value="newline">换行</option>
              <option value="ampersand">&amp;</option>
            </select>
          </label>
        </section>

        <label class="field-row">
          <span class="field-label">目标签名（可选）</span>
          <input v-model="targetSignature" class="text-input" type="text" placeholder="粘贴服务端期望签名做比对" />
        </label>

        <p class="helper-text" :class="{ 'helper-text-danger': Boolean(statusMessage) }">
          {{ statusMessage || '输入更新后会自动计算签名。默认不保存 secret。' }}
        </p>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">结果</h2>
            <p class="meta-hint">可在 hex/base64 之间切换，并用目标值判断是否匹配。</p>
          </div>
        </div>

        <section v-if="mode === 'request'" class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Canonical String</span>
            <button type="button" class="ghost-button small-button" @click="copyValue(canonicalMessage, 'Canonical')">
              复制
            </button>
          </div>
          <textarea :value="canonicalMessage" class="text-area text-area-compact" readonly />
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">签名结果</span>
            <div class="input-toolbar">
              <select v-model="outputFormat" class="select-input">
                <option value="hex">hex</option>
                <option value="base64">base64</option>
              </select>
              <button
                type="button"
                class="ghost-button small-button"
                @click="copyValue(outputFormat === 'hex' ? signatureHex : signatureBase64, '签名')"
              >
                复制
              </button>
            </div>
          </div>

          <code class="package-command-code hash-code">
            {{ outputFormat === 'hex' ? signatureHex : signatureBase64 }}
          </code>

          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">比对</span>
                <strong class="result-value">
                  {{
                    compareHex.normalizedTarget
                      ? compareHex.matched
                        ? '匹配'
                        : '不匹配'
                      : '未输入目标签名'
                  }}
                </strong>
              </div>
            </article>
          </div>
        </section>
      </section>
    </div>

    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>

