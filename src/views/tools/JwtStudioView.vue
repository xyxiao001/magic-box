<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { buildUnsignedJwt, parseJwt } from '@/lib/jwt'

interface JwtTemplate {
  label: string
  summary: string
  token: string
}

const nowSeconds = Math.floor(Date.now() / 1000)

const jwtTemplates: JwtTemplate[] = [
  {
    label: '有效 Access Token',
    summary: '适合联调成功场景，包含常见身份与时间字段。',
    token: buildUnsignedJwt(
      { alg: 'HS256', typ: 'JWT', kid: 'dev-key-1' },
      {
        sub: 'user_1024',
        aud: 'magic-box-web',
        iss: 'https://auth.magic-box.dev',
        scope: 'tool:read tool:write',
        iat: nowSeconds - 180,
        nbf: nowSeconds - 120,
        exp: nowSeconds + 3600,
      }
    ),
  },
  {
    label: '已过期 Token',
    summary: '适合验证刷新逻辑和过期状态展示。',
    token: buildUnsignedJwt(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: 'user_expired',
        role: 'editor',
        iat: nowSeconds - 7200,
        exp: nowSeconds - 60,
      }
    ),
  },
  {
    label: '未生效 Token',
    summary: '适合排查 nbf 配置和服务端时间偏差。',
    token: buildUnsignedJwt(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: 'user_pending',
        tenant: 'staging',
        iat: nowSeconds,
        nbf: nowSeconds + 600,
        exp: nowSeconds + 7200,
      }
    ),
  },
]

const storageKey = 'magic-box.jwt-studio.token'
const tokenInput = ref(localStorage.getItem(storageKey) || jwtTemplates[0]?.token || '')
const copiedMessage = ref('')

const parsed = computed(() => parseJwt(tokenInput.value))
const statusLabel = computed(() => {
  if (parsed.value.status === 'active') {
    return '有效'
  }

  if (parsed.value.status === 'expired') {
    return '已过期'
  }

  if (parsed.value.status === 'not-yet-valid') {
    return '未生效'
  }

  return '无效'
})

const statusTone = computed<'neutral' | 'success' | 'danger'>(() => {
  if (parsed.value.status === 'active') {
    return 'success'
  }

  if (parsed.value.status === 'invalid' || parsed.value.status === 'expired') {
    return 'danger'
  }

  return 'neutral'
})

function applyTemplate(template: JwtTemplate) {
  tokenInput.value = template.token
}

async function copyValue(value: string, label: string) {
  if (!value) {
    copiedMessage.value = `当前没有可复制的${label}`
  } else {
    const success = await copyToClipboard(value)
    copiedMessage.value = success ? `${label}已复制` : '当前环境不支持复制'
  }

  window.setTimeout(() => {
    copiedMessage.value = ''
  }, 1600)
}

function clearInput() {
  tokenInput.value = ''
}

watch(tokenInput, (value) => {
  localStorage.setItem(storageKey, value)
})
</script>

<template>
  <section class="tool-page tool-page-jwt">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">Token 输入</h2>
            <p class="meta-hint">只在本地解析 header / payload，不上传到外部服务。</p>
          </div>
          <span class="workspace-chip">{{ statusLabel }}</span>
        </div>

        <div class="input-toolbar">
          <button
            v-for="template in jwtTemplates"
            :key="template.label"
            type="button"
            class="ghost-button small-button"
            @click="applyTemplate(template)"
          >
            {{ template.label }}
          </button>
          <button type="button" class="ghost-button small-button" @click="clearInput">清空</button>
          <button type="button" class="ghost-button small-button" @click="copyValue(tokenInput, '原始 token')">
            复制 Token
          </button>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">模板说明</span>
            <span class="meta-hint">快速覆盖“有效 / 过期 / 未生效”三种常见状态。</span>
          </div>

          <div class="jwt-template-list">
            <button
              v-for="template in jwtTemplates"
              :key="template.label"
              type="button"
              class="http-template-card"
              @click="applyTemplate(template)"
            >
              <div class="http-template-top">
                <span class="http-template-method">JWT</span>
                <span class="http-template-action">使用模板</span>
              </div>
              <strong class="http-template-title">{{ template.label }}</strong>
              <p class="http-template-summary">{{ template.summary }}</p>
            </button>
          </div>
        </section>

        <label class="field-row">
          <span class="field-label">JWT</span>
          <textarea
            v-model="tokenInput"
            class="text-area jwt-input"
            spellcheck="false"
            placeholder="粘贴完整的 header.payload.signature"
          />
        </label>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">解析结果</h2>
            <p
              class="helper-text"
              :class="{
                'helper-text-success': statusTone === 'success',
                'helper-text-danger': statusTone === 'danger',
              }"
            >
              {{ parsed.error || parsed.summary }}
            </p>
          </div>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">状态摘要</span>
            <span class="meta-hint">优先确认 token 当前是否可用，以及时间字段是否合理。</span>
          </div>

          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">状态</span>
                <strong class="result-value">{{ statusLabel }}</strong>
              </div>
              <button type="button" class="ghost-button small-button" @click="copyValue(parsed.signatureText, '签名')">
                复制签名
              </button>
            </article>

            <article v-for="row in parsed.timeRows" :key="row.label" class="data-row">
              <div>
                <span class="result-label">{{ row.label }}</span>
                <strong class="result-value">{{ row.value }}</strong>
              </div>
            </article>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Claims</span>
            <span class="meta-hint">只展开最常见的前几项，避免信息过载。</span>
          </div>

          <div v-if="parsed.claimRows.length" class="data-list">
            <article v-for="row in parsed.claimRows" :key="row.label" class="data-row">
              <div>
                <span class="result-label">{{ row.label }}</span>
                <strong class="result-value">{{ row.value }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>解析成功后，这里会展示 payload 中的关键字段。</p>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Header</span>
            <button type="button" class="ghost-button small-button" @click="copyValue(parsed.headerText, 'header')">
              复制
            </button>
          </div>

          <textarea :value="parsed.headerText" class="text-area text-area-compact" readonly placeholder="Header JSON 会显示在这里" />
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Payload</span>
            <button type="button" class="ghost-button small-button" @click="copyValue(parsed.payloadText, 'payload')">
              复制
            </button>
          </div>

          <textarea :value="parsed.payloadText" class="text-area jwt-output" readonly placeholder="Payload JSON 会显示在这里" />
        </section>
      </section>
    </div>

    <p v-if="copiedMessage" class="clipboard-toast">{{ copiedMessage }}</p>
  </section>
</template>
