<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDraft } from '@/tool-runtime/composables/useToolDraft'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import {
  insertClipboardEntry,
  removeClipboardEntry,
  togglePinnedEntry,
  type ClipboardEntry,
} from './logic'
import {
  clipboardHistoryRuntimeModule,
  type ClipboardHistoryInput,
  type ClipboardHistoryOutput,
} from './module'

const storageKey = 'magic-box.clipboard-history.entries'
const storageDomain = 'tool-history:clipboard-history:entries'
const inputText = ref('')

function parseClipboardEntries(raw: string) {
  try {
    return JSON.parse(raw) as ClipboardEntry[]
  } catch {
    return undefined
  }
}

const state = useToolState<ClipboardHistoryInput, ClipboardHistoryOutput>(clipboardHistoryRuntimeModule)
const draft = useToolDraft(clipboardHistoryRuntimeModule, state, {
  legacyKeys: [storageDomain, storageKey],
  parseLegacy: (raw) => ({
    entries: parseClipboardEntries(raw) || [],
    searchQuery: '',
  }),
})
const { run } = useToolExecution(clipboardHistoryRuntimeModule, state)
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const output = computed(() => state.output.value)

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

function addCurrentText() {
  state.input.value.entries = insertClipboardEntry(state.input.value.entries, inputText.value)
  inputText.value = ''
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    state.input.value.entries = insertClipboardEntry(state.input.value.entries, text)
    showSuccessMessage('已从剪贴板读取并加入历史')
  } catch {
    showErrorMessage('当前环境无法直接读取剪贴板，请手动粘贴')
  }
}

async function copyEntry(text: string) {
  const success = await copyToClipboard(text)
  if (success) {
    showSuccessMessage('内容已复制')
    return
  }
  showErrorMessage('当前环境不支持复制')
}

function clearAll() {
  draft.clearDraft()
  state.input.value.entries = []
  state.input.value.searchQuery = ''
  inputText.value = ''
}

onMounted(() => {
  void run()
})
</script>

<template>
  <ToolScaffold :meta="clipboardHistoryRuntimeModule.meta" :loading="false" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="addCurrentText">加入历史</button>
        <button type="button" class="ghost-button" @click="pasteFromClipboard">读取剪贴板</button>
        <button type="button" class="ghost-button" :disabled="!state.input.value.entries.length" @click="clearAll">清空全部</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="新增内容" subtitle="适合暂存命令、链接、地址、文案或代码片段。">
        <label class="field-row">
          <span class="field-label">内容</span>
          <textarea v-model="inputText" class="text-area text-area-full" spellcheck="false" />
        </label>
      </ToolPaneShell>
    </template>

    <template #output>
      <ToolPaneShell title="历史记录" :subtitle="`共 ${output?.totalCount || 0} 条，置顶 ${output?.pinnedCount || 0} 条`">
        <label class="field-row">
          <span class="field-label">搜索</span>
          <input v-model="state.input.value.searchQuery" class="text-input" type="text" placeholder="搜索历史文本" />
        </label>

        <div v-if="output?.filteredEntries.length" class="clipboard-entry-list">
          <article v-for="entry in output.filteredEntries" :key="entry.id" class="hash-result-card">
            <div class="result-panel-header">
              <span class="result-panel-title">{{ entry.pinned ? '已置顶' : '历史项' }}</span>
              <div class="input-toolbar">
                <button type="button" class="ghost-button small-button" @click="copyEntry(entry.text)">复制</button>
                <button type="button" class="ghost-button small-button" @click="state.input.value.entries = togglePinnedEntry(state.input.value.entries, entry.id)">
                  {{ entry.pinned ? '取消置顶' : '置顶' }}
                </button>
                <button type="button" class="ghost-button small-button" @click="state.input.value.entries = removeClipboardEntry(state.input.value.entries, entry.id)">
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
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
