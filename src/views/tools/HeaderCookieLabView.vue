<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  dedupeHeaders,
  mergeHeaders,
  parseCookieHeader,
  parseHeadersText,
  parseSetCookieText,
  stringifyCookieHeader,
  stringifyHeaders,
  type CookieEntry,
  type SetCookieEntry,
} from '@/lib/header-cookie'

type Mode = 'headers' | 'cookie' | 'set-cookie'

const primaryKey = 'magic-box.header-cookie.primary'
const secondaryKey = 'magic-box.header-cookie.secondary'
const modeKey = 'magic-box.header-cookie.mode'

const mode = ref<Mode>((localStorage.getItem(modeKey) as Mode) || 'headers')
const primaryText = ref(localStorage.getItem(primaryKey) || 'Authorization: Bearer ...\nContent-Type: application/json')
const secondaryText = ref(localStorage.getItem(secondaryKey) || '')
const dedupeMode = ref<'keep-last' | 'keep-first'>('keep-last')
const toastMessage = ref('')

const cookieEntries = computed<CookieEntry[]>(() => parseCookieHeader(primaryText.value))
const setCookieEntries = computed<SetCookieEntry[]>(() => parseSetCookieText(primaryText.value))

const mergedHeaders = computed(() => mergeHeaders(parseHeadersText(primaryText.value), parseHeadersText(secondaryText.value)))
const dedupedHeaders = computed(() => dedupeHeaders(mergedHeaders.value, dedupeMode.value))

const exportText = computed(() => {
  if (mode.value === 'headers') {
    return stringifyHeaders(dedupedHeaders.value)
  }

  if (mode.value === 'cookie') {
    return stringifyCookieHeader(cookieEntries.value)
  }

  return JSON.stringify(setCookieEntries.value, null, 2)
})

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  toastMessage.value = success ? `${label}已复制` : '当前环境不支持复制'
  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

function clearAll() {
  primaryText.value = ''
  secondaryText.value = ''
}

watch([primaryText, secondaryText, mode], () => {
  localStorage.setItem(primaryKey, primaryText.value)
  localStorage.setItem(secondaryKey, secondaryText.value)
  localStorage.setItem(modeKey, mode.value)
})
</script>

<template>
  <section class="tool-page tool-page-header-cookie">
    <div class="tool-page-layout wide-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">输入</h2>
            <p class="meta-hint">支持解析 Header、Cookie 和 Set-Cookie，并导出结构化结果。</p>
          </div>
          <span class="workspace-chip">{{ mode }}</span>
        </div>

        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="mode === 'headers'" @click="mode = 'headers'">
            Header
          </button>
          <button type="button" class="tab-button" :data-active="mode === 'cookie'" @click="mode = 'cookie'">
            Cookie
          </button>
          <button type="button" class="tab-button" :data-active="mode === 'set-cookie'" @click="mode = 'set-cookie'">
            Set-Cookie
          </button>
        </div>

        <label class="field-row">
          <span class="field-label">主输入</span>
          <textarea
            v-model="primaryText"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="粘贴原始 header/cookie 文本"
          />
        </label>

        <label v-if="mode === 'headers'" class="field-row">
          <span class="field-label">合并输入</span>
          <textarea
            v-model="secondaryText"
            class="text-area text-area-compact"
            spellcheck="false"
            placeholder="可选：粘贴第二段 header，用于合并/去重"
          />
        </label>

        <div class="input-toolbar">
          <button type="button" class="ghost-button small-button" @click="clearAll">清空</button>
          <button
            v-if="mode === 'headers'"
            type="button"
            class="ghost-button small-button"
            @click="copyValue(stringifyHeaders(dedupedHeaders), 'Header 文本')"
          >
            复制 Header
          </button>
          <button
            v-if="mode === 'cookie'"
            type="button"
            class="ghost-button small-button"
            @click="copyValue(stringifyCookieHeader(cookieEntries), 'Cookie')"
          >
            复制 Cookie
          </button>
          <button
            v-if="mode === 'set-cookie'"
            type="button"
            class="ghost-button small-button"
            @click="copyValue(JSON.stringify(setCookieEntries, null, 2), 'Set-Cookie JSON')"
          >
            复制 JSON
          </button>
        </div>

        <section v-if="mode === 'headers'" class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">去重策略</span>
            <span class="meta-hint">某些 header 允许重复，首版默认保留最后一次出现。</span>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">策略</span>
              <select v-model="dedupeMode" class="select-input">
                <option value="keep-last">保留最后</option>
                <option value="keep-first">保留最先</option>
              </select>
            </label>
            <article class="data-row">
              <div>
                <span class="result-label">合并后数量</span>
                <strong class="result-value">{{ mergedHeaders.length }}</strong>
              </div>
              <div>
                <span class="result-label">去重后数量</span>
                <strong class="result-value">{{ dedupedHeaders.length }}</strong>
              </div>
            </article>
          </div>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">结构化视图</h2>
            <p class="meta-hint">解析结果仅做常见格式支持，边界输入会尽力解析并保持可读。</p>
          </div>
        </div>

        <section v-if="mode === 'headers'" class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Headers</span>
            <button type="button" class="ghost-button small-button" @click="copyValue(exportText, '导出文本')">
              复制导出
            </button>
          </div>

          <div v-if="dedupedHeaders.length" class="data-list">
            <article v-for="entry in dedupedHeaders" :key="entry.id" class="data-row">
              <div>
                <span class="result-label">{{ entry.key }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>输入 header 后，这里会显示结构化结果。</p>
          </div>
        </section>

        <section v-else-if="mode === 'cookie'" class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Cookie</span>
            <button type="button" class="ghost-button small-button" @click="copyValue(exportText, 'Cookie')">复制</button>
          </div>

          <div v-if="cookieEntries.length" class="data-list">
            <article v-for="entry in cookieEntries" :key="entry.id" class="data-row">
              <div>
                <span class="result-label">{{ entry.name }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>输入 Cookie header 后，这里会显示键值列表。</p>
          </div>
        </section>

        <section v-else class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">Set-Cookie</span>
            <button type="button" class="ghost-button small-button" @click="copyValue(exportText, 'Set-Cookie JSON')">
              复制导出
            </button>
          </div>

          <div v-if="setCookieEntries.length" class="data-list">
            <article v-for="entry in setCookieEntries" :key="entry.id" class="data-row">
              <div>
                <span class="result-label">{{ entry.name }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
                <span class="meta-hint">{{ Object.keys(entry.attributes).join(', ') || '无属性' }}</span>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>输入 Set-Cookie 后，这里会显示结构化结果。</p>
          </div>

          <textarea :value="exportText" class="text-area text-area-full" readonly />
        </section>
      </section>
    </div>

    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>
