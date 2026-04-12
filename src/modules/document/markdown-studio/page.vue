<script setup lang="ts">
import Prism from 'prismjs'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
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
import {
  buildMarkdownStudioHistoryLabel,
  markdownStudioRuntimeModule,
  type MarkdownStudioInput,
  type MarkdownStudioOutput,
} from './module'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-typescript'

const storageKey = 'magic-box.markdown-studio.draft'
const storageDomain = 'tool-history:markdown-studio:draft'
const previewRoot = ref<HTMLDivElement | null>(null)

const state = useToolState<MarkdownStudioInput, MarkdownStudioOutput>(markdownStudioRuntimeModule)
const draft = useToolDraft(markdownStudioRuntimeModule, state, {
  legacyKeys: [storageDomain, storageKey],
  parseLegacy: (raw) => ({
    markdownInput: raw,
  }),
})
const history = useToolHistory(markdownStudioRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildMarkdownStudioHistoryLabel(output) : 'Markdown 快照',
    description: output ? `${output.stats.paragraphs} 段 / ${output.stats.codeBlocks} 代码块` : '',
  }),
})
const { run } = useToolExecution(markdownStudioRuntimeModule, state)
const samples = useToolSamples(markdownStudioRuntimeModule, state)
const share = useToolShare(markdownStudioRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage, info: showInfoMessage } = useMessage()

const restoredSharedState = share.restoreSharedState()
const output = computed(() => state.output.value)

function renderPreview() {
  const root = previewRoot.value
  if (!root) return
  root.innerHTML = output.value?.htmlPreview || ''
  root.querySelectorAll('pre code[class*="language-"]').forEach((node) => {
    Prism.highlightElement(node as HTMLElement)
  })
}

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

watch(
  () => output.value?.htmlPreview,
  () => {
    void nextTick(() => {
      renderPreview()
    })
  }
)

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
  void run()
}

async function copySource() {
  const success = await copyToClipboard(state.input.value.markdownInput)
  if (success) {
    showSuccessMessage('原文已复制')
    return
  }
  showErrorMessage('当前环境不支持复制')
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function buildExportStyles(theme: string | undefined) {
  const isLight = theme === 'mac-light'
  const background = isLight ? '#eef2f8' : '#07111d'
  const text = isLight ? '#172235' : '#ecf4ff'
  const muted = isLight ? '#69758d' : '#94a8c5'
  const border = isLight ? 'rgba(84, 102, 132, 0.14)' : 'rgba(140, 190, 255, 0.16)'
  const cardBackground = isLight
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(250, 252, 255, 0.96))'
    : 'linear-gradient(180deg, rgba(15, 29, 48, 0.82), rgba(9, 18, 31, 0.9))'
  const inlineCodeBackground = isLight ? 'rgba(10, 132, 255, 0.06)' : 'rgba(255, 255, 255, 0.04)'
  const inlineCodeBorder = isLight ? 'rgba(105, 124, 154, 0.14)' : 'rgba(255, 255, 255, 0.08)'
  const blockquoteBackground = isLight ? 'rgba(10, 132, 255, 0.06)' : 'rgba(255, 255, 255, 0.04)'
  const linkDecoration = isLight ? 'rgba(10, 132, 255, 0.32)' : 'rgba(140, 240, 218, 0.4)'
  const codeBlockBackground = isLight
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(250, 252, 255, 0.86))'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 38%), rgba(3, 9, 16, 0.58)'

  return `
    :root{color:${text};background:${background};font-family:'IBM Plex Sans','PingFang SC','Helvetica Neue',sans-serif;line-height:1.6;}
    *{box-sizing:border-box;}
    body{margin:0;padding:24px;background:${background};}
    .markdown-preview{max-width:960px;margin:0 auto;padding:22px;border:1px solid ${border};border-radius:24px;background:${cardBackground};}
    .markdown-preview p{margin:0 0 12px;}
    .markdown-preview h1,.markdown-preview h2,.markdown-preview h3,.markdown-preview h4,.markdown-preview h5,.markdown-preview h6{margin:18px 0 10px;}
    .markdown-preview ul,.markdown-preview ol{margin:0 0 12px 18px;padding:0;display:grid;gap:6px;}
    .markdown-preview a{color:${isLight ? '#0a84ff' : '#8cf0da'};text-decoration:underline;text-underline-offset:3px;text-decoration-color:${linkDecoration};}
    .markdown-preview code{padding:2px 7px;border-radius:10px;border:1px solid ${inlineCodeBorder};background:${inlineCodeBackground};}
    .markdown-preview .md-pre{margin:12px 0;padding:14px 16px;border-radius:20px;border:1px solid ${inlineCodeBorder};background:${codeBlockBackground};overflow:auto;}
    .markdown-preview .md-pre code{padding:0;border:none;background:transparent;}
    .markdown-preview blockquote{margin:12px 0;padding:12px 14px;border-radius:18px;border:1px solid ${border};background:${blockquoteBackground};}
    .markdown-preview blockquote p{margin:0;color:${muted};}
    .markdown-preview table{width:100%;margin:12px 0;border-collapse:separate;border-spacing:0;border:1px solid ${border};border-radius:18px;overflow:hidden;}
    .markdown-preview th,.markdown-preview td{padding:10px 12px;border-bottom:1px solid ${inlineCodeBorder};vertical-align:top;}
    .markdown-preview th{text-align:left;background:${inlineCodeBackground};}
    .markdown-preview tr:last-child td{border-bottom:none;}
    .markdown-preview .md-task-list-item{list-style:none;}
    .markdown-preview .md-task-label{display:inline-flex;align-items:flex-start;gap:10px;}
    .markdown-preview .md-task-label input{margin-top:4px;}
  `.trim()
}

function exportHtml() {
  const root = previewRoot.value
  if (!root) {
    showErrorMessage('预览区未就绪')
    return
  }

  const theme = document.documentElement.dataset.theme
  const css = buildExportStyles(theme)
  const doc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Markdown Studio Export</title>
    <style>${css}</style>
  </head>
  <body>
    <main class="markdown-preview">${root.innerHTML}</main>
  </body>
</html>`

  downloadBlob('markdown-studio.html', new Blob([doc], { type: 'text/html;charset=utf-8' }))
  showSuccessMessage('已导出 HTML')
}

async function exportPng() {
  const root = previewRoot.value
  if (!root) {
    showErrorMessage('预览区未就绪')
    return
  }

  try {
    const { toPng } = await import('html-to-image')
    const theme = document.documentElement.dataset.theme
    const backgroundColor = theme === 'mac-light' ? '#eef2f8' : '#07111d'
    const dataUrl = await toPng(root, { cacheBust: true, pixelRatio: 2, backgroundColor })
    const blob = await (await fetch(dataUrl)).blob()
    downloadBlob('markdown-studio.png', blob)
    showSuccessMessage('已导出 PNG')
  } catch {
    showErrorMessage('导出 PNG 失败')
  }
}

function saveSnapshot() {
  if (!state.output.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

function clearAll() {
  draft.clearDraft()
  state.input.value.markdownInput = ''
  state.output.value = null
  state.error.value = null
}

onMounted(() => {
  if (!restoredSharedState) {
    void run()
  }
  void nextTick(() => {
    renderPreview()
  })
})
</script>

<template>
  <ToolScaffold :meta="markdownStudioRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="copySource">复制原文</button>
        <button type="button" class="ghost-button" @click="exportHtml">导出 HTML</button>
        <button type="button" class="ghost-button" @click="exportPng">导出 PNG</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell
        title="编辑区"
        :subtitle="output ? `${output.stats.chars} chars · ${output.stats.paragraphs} 段 · ${output.stats.codeBlocks} 块` : '支持标题、列表、任务列表、引用、表格、图片与代码块。'"
      >
        <label class="field-row">
          <span class="field-label">Markdown</span>
          <textarea v-model="state.input.value.markdownInput" class="text-area text-area-full" spellcheck="false" placeholder="# Hello" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <p class="helper-text">
          预览区只做轻量渲染和高频语法支持，优先保证安全和可读。
        </p>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的 Markdown 编辑结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<MarkdownStudioInput, MarkdownStudioOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="预览区" subtitle="预览与导出共用同一份 HTML，降低导出与页面不一致的概率。">
        <div ref="previewRoot" class="doc-card markdown-preview"></div>
        <p class="helper-text" @click="showInfoMessage('可直接在上方导出 HTML / PNG')">
          支持代码高亮、表格、任务列表和图片渲染。
        </p>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
