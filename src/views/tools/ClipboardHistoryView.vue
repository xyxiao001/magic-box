<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  insertClipboardEntry,
  removeClipboardEntry,
  searchClipboardEntries,
  togglePinnedEntry,
  type ClipboardEntry,
} from '@/lib/clipboard-history'
import { readStorage, writeStorage } from '@/lib/storage'

const storageKey = 'magic-box.clipboard-history.entries'
const storageDomain = 'tool-history:clipboard-history:entries'

function parseClipboardEntries(raw: string) {
  try {
    return JSON.parse(raw) as ClipboardEntry[]
  } catch {
    return undefined
  }
}

const entries = ref<ClipboardEntry[]>(
  readStorage<ClipboardEntry[]>(storageDomain, [], {
    legacyKeys: [storageKey],
    parseLegacy: (raw) => parseClipboardEntries(raw),
  })
)
const inputText = ref('')
const searchQuery = ref('')
const statusMessage = ref('支持手动新增，也可主动读取当前剪贴板内容')
const filteredEntries = computed(() => searchClipboardEntries(entries.value, searchQuery.value))

watch(
  entries,
  (value) => {
    writeStorage(storageDomain, value)
  },
  { deep: true }
)

function addCurrentText() {
  entries.value = insertClipboardEntry(entries.value, inputText.value)
  inputText.value = ''
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    entries.value = insertClipboardEntry(entries.value, text)
    statusMessage.value = '已从剪贴板读取并加入历史'
  } catch {
    statusMessage.value = '当前环境无法直接读取剪贴板，请手动粘贴'
  }
}

async function copyEntry(text: string) {
  const success = await copyToClipboard(text)
  statusMessage.value = success ? '内容已复制' : '当前环境不支持复制'
}
</script>

<template>
  <section class="tool-page tool-page-clipboard">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">新增内容</h2>
            <p class="meta-hint">适合暂存命令、链接、地址、文案或代码片段。</p>
          </div>
        </div>

        <label class="field-row">
          <span class="field-label">内容</span>
          <textarea v-model="inputText" class="text-area text-area-full" spellcheck="false" />
        </label>

        <div class="input-toolbar">
          <button type="button" class="solid-button" @click="addCurrentText">加入历史</button>
          <button type="button" class="ghost-button" @click="pasteFromClipboard">读取剪贴板</button>
        </div>

        <p class="helper-text">{{ statusMessage }}</p>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">历史记录</h2>
            <p class="meta-hint">支持搜索、置顶、复制与删除，本地持久化。</p>
          </div>
        </div>

        <label class="field-row">
          <span class="field-label">搜索</span>
          <input v-model="searchQuery" class="text-input" type="text" placeholder="搜索历史文本" />
        </label>

        <div v-if="filteredEntries.length" class="clipboard-entry-list">
          <article v-for="entry in filteredEntries" :key="entry.id" class="hash-result-card">
            <div class="result-panel-header">
              <span class="result-panel-title">{{ entry.pinned ? '已置顶' : '历史项' }}</span>
              <div class="input-toolbar">
                <button type="button" class="ghost-button small-button" @click="copyEntry(entry.text)">复制</button>
                <button type="button" class="ghost-button small-button" @click="entries = togglePinnedEntry(entries, entry.id)">
                  {{ entry.pinned ? '取消置顶' : '置顶' }}
                </button>
                <button type="button" class="ghost-button small-button" @click="entries = removeClipboardEntry(entries, entry.id)">
                  删除
                </button>
              </div>
            </div>
            <pre class="package-command-code clipboard-entry-code">{{ entry.text }}</pre>
          </article>
        </div>
        <div v-else class="empty-panel">
          <p>暂无历史记录，先添加一条内容试试。</p>
        </div>
      </section>
    </div>
  </section>
</template>
