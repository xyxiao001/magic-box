<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import JsonTreeNode from '@/components/JsonTreeNode.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { convertJsonToJsObject, formatJson, minifyJson, parseJsonValue, validateJson } from '@/lib/json-tool'
import { readStorage, writeStorage } from '@/lib/storage'

type OutputType = 'json' | 'js-object' | 'message' | 'empty'
type OutputTab = 'text' | 'tree'

const jsonToolkitStateDomain = 'tool-history:json-toolkit:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      input: string
      outputTab: OutputTab
    }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<
  Partial<{
    input: string
    outputTab: OutputTab
  }>
>(jsonToolkitStateDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const jsonInput = ref(savedState.input ?? `{
  "requestId": "req_01HV7Y9K2X8MABCD",
  "success": true,
  "timestamp": "2026-04-11T13:20:00.000Z",
  "app": {
    "name": "Magic Box",
    "version": "1.3.0",
    "env": "prod",
    "maintainer": {
      "name": "frontend-team",
      "slack": "#magic-box"
    }
  },
  "user": {
    "id": 1024,
    "name": "Alice",
    "roles": ["admin", "developer"],
    "profile": {
      "email": "alice@example.com",
      "lastLoginAt": "2026-04-11T09:32:18.000Z",
      "preferences": {
        "theme": "dark",
        "language": "zh-CN",
        "favorites": ["json-toolkit", "diff-studio", "request-converter"]
      }
    }
  },
  "metrics": {
    "loadTimeMs": 128.6,
    "memoryMb": 84.2,
    "errorCount": 0
  },
  "experiments": [
    {
      "key": "json-tree-v2",
      "enabled": true,
      "ratio": 0.5
    },
    {
      "key": "smart-default-input",
      "enabled": false,
      "ratio": 0
    }
  ],
  "items": [
    {
      "id": "tool_001",
      "title": "JSON Toolkit",
      "tags": ["json", "format", "validate"],
      "stats": {
        "views": 1823,
        "likes": 231
      }
    },
    {
      "id": "tool_002",
      "title": "Request Converter",
      "tags": ["curl", "fetch", "axios"],
      "stats": {
        "views": 964,
        "likes": 121
      }
    }
  ],
  "feature-flags": {
    "allowCopy": true,
    "allowShare": false,
    "fallback": null
  }
}`)
const jsonOutput = ref('')
const outputType = ref<OutputType>('empty')
const outputTab = ref<OutputTab>(savedState.outputTab ?? 'text')
const structuredOutput = ref<unknown | null>(null)
const hasStructuredOutput = ref(false)
const treeOpenDepth = ref(1)
const treeRenderKey = ref(0)
const fullscreenPreviewOpen = ref(false)
const fullscreenTreeOpenDepth = ref(2)
const fullscreenTreeRenderKey = ref(0)
const statusMessage = ref('准备就绪')
const statusTone = ref<'neutral' | 'success' | 'danger'>('neutral')

const canUseOutput = computed(() => Boolean(jsonOutput.value))
const canApplyOutput = computed(() => outputType.value === 'json' || outputType.value === 'js-object')
const canShowTree = computed(() => hasStructuredOutput.value)
const outputMetrics = computed(() => {
  const text = jsonOutput.value

  if (!text) {
    return []
  }

  return [
    `${text.length} 字符`,
    `${text.split('\n').length} 行`,
    outputType.value === 'js-object' ? 'JS 对象' : 'JSON 文本',
  ]
})

watch([jsonInput, outputTab], () => {
  writeStorage(jsonToolkitStateDomain, {
    input: jsonInput.value,
    outputTab: outputTab.value,
  })
})

function applyStatus(message: string, tone: 'neutral' | 'success' | 'danger') {
  statusMessage.value = message
  statusTone.value = tone
}

function clearOutput() {
  jsonOutput.value = ''
  structuredOutput.value = null
  hasStructuredOutput.value = false
  outputType.value = 'empty'
}

function resetTree(openDepth = 1) {
  treeOpenDepth.value = openDepth
  treeRenderKey.value += 1
}

function applyStructuredResult(
  text: string,
  data: unknown,
  type: Exclude<OutputType, 'message' | 'empty'>,
  status: string,
  tone: 'neutral' | 'success' | 'danger',
  nextTab: OutputTab
) {
  jsonOutput.value = text
  structuredOutput.value = data
  hasStructuredOutput.value = true
  outputType.value = type
  outputTab.value = nextTab
  resetTree(type === 'json' ? 1 : 2)
  applyStatus(status, tone)
}

function runFormat() {
  const result = formatJson(jsonInput.value)

  if (!result.ok) {
    clearOutput()
    applyStatus(result.error ?? 'JSON 解析失败', 'danger')
    return
  }

  const parsed = parseJsonValue(jsonInput.value)

  if (!parsed.ok) {
    clearOutput()
    applyStatus(parsed.error ?? 'JSON 解析失败', 'danger')
    return
  }

  applyStructuredResult(result.value ?? '', parsed.value ?? null, 'json', '格式化完成，可切换到结构预览折叠浏览', 'success', 'tree')
}

function runMinify() {
  const result = minifyJson(jsonInput.value)

  if (!result.ok) {
    clearOutput()
    applyStatus(result.error ?? 'JSON 解析失败', 'danger')
    return
  }

  const parsed = parseJsonValue(jsonInput.value)

  if (!parsed.ok) {
    clearOutput()
    applyStatus(parsed.error ?? 'JSON 解析失败', 'danger')
    return
  }

  applyStructuredResult(result.value ?? '', parsed.value ?? null, 'json', '压缩完成', 'success', 'text')
}

function runValidate() {
  const result = validateJson(jsonInput.value)

  if (!result.ok) {
    clearOutput()
    applyStatus(result.error ?? 'JSON 解析失败', 'danger')
    return
  }

  const parsed = parseJsonValue(jsonInput.value)

  if (!parsed.ok) {
    clearOutput()
    applyStatus(parsed.error ?? 'JSON 解析失败', 'danger')
    return
  }

  jsonOutput.value = result.value ?? 'JSON 有效'
  structuredOutput.value = parsed.value ?? null
  hasStructuredOutput.value = true
  outputType.value = 'message'
  outputTab.value = 'tree'
  resetTree(1)
  applyStatus('JSON 有效，可直接查看结构预览', 'success')
}

function runConvertToJsObject() {
  const result = convertJsonToJsObject(jsonInput.value)

  if (!result.ok) {
    clearOutput()
    applyStatus(result.error ?? 'JSON 解析失败', 'danger')
    return
  }

  const parsed = parseJsonValue(jsonInput.value)

  if (!parsed.ok) {
    clearOutput()
    applyStatus(parsed.error ?? 'JSON 解析失败', 'danger')
    return
  }

  applyStructuredResult(result.value ?? '', parsed.value ?? null, 'js-object', '已转换为 JS 对象字面量', 'success', 'text')
}

function useOutputAsInput() {
  if (!jsonOutput.value) {
    return
  }

  jsonInput.value = jsonOutput.value
  applyStatus('已应用到左侧输入区', 'neutral')
}

async function copyOutput() {
  const success = await copyToClipboard(jsonOutput.value)
  applyStatus(success ? '输出已复制' : '当前环境不支持复制', success ? 'neutral' : 'danger')
}

function expandTree() {
  resetTree(99)
}

function collapseTree() {
  resetTree(0)
}

function resetFullscreenTree(openDepth = 2) {
  fullscreenTreeOpenDepth.value = openDepth
  fullscreenTreeRenderKey.value += 1
}

function openFullscreenPreview() {
  if (!canShowTree.value) {
    return
  }

  fullscreenPreviewOpen.value = true
  resetFullscreenTree(2)
}

function closeFullscreenPreview() {
  fullscreenPreviewOpen.value = false
}

function expandFullscreenTree() {
  resetFullscreenTree(99)
}

function collapseFullscreenTree() {
  resetFullscreenTree(0)
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && fullscreenPreviewOpen.value) {
    closeFullscreenPreview()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
})
</script>

<template>
  <section class="tool-page tool-page-json">
    <div class="tool-page-layout wide-layout json-tool-layout">
      <section class="editor-pane json-tool-pane json-tool-pane-editor">
        <div class="pane-header">
          <h2 class="pane-title">原始内容</h2>
          <p class="meta-hint">适合直接粘贴接口响应、配置文件和临时调试数据。</p>
        </div>

        <textarea
          v-model="jsonInput"
          class="text-area text-area-full"
          spellcheck="false"
          placeholder='{"name":"magic-box"}'
        />
      </section>

      <section class="viewer-pane json-tool-pane json-tool-pane-viewer">
        <div class="pane-header">
          <h2 class="pane-title">结果</h2>
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

        <div class="input-toolbar">
          <button type="button" class="solid-button" @click="runFormat">格式化</button>
          <button type="button" class="ghost-button" @click="runMinify">压缩</button>
          <button type="button" class="ghost-button" @click="runValidate">校验</button>
          <button type="button" class="ghost-button" @click="runConvertToJsObject">转 JS 对象</button>
          <button type="button" class="ghost-button" :disabled="!canApplyOutput" @click="useOutputAsInput">应用到输入</button>
          <button type="button" class="ghost-button" :disabled="!canUseOutput" @click="copyOutput">复制输出</button>
        </div>

        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="outputTab === 'text'" @click="outputTab = 'text'">
            文本结果
          </button>
          <button
            type="button"
            class="tab-button"
            :data-active="outputTab === 'tree'"
            :disabled="!canShowTree"
            @click="outputTab = 'tree'"
          >
            结构预览
          </button>
          <span v-for="item in outputMetrics" :key="item" class="workspace-chip">{{ item }}</span>
        </div>

        <textarea
          v-if="outputTab === 'text'"
          :value="jsonOutput"
          class="text-area text-area-full json-output-area"
          readonly
          :placeholder="outputType === 'empty' ? '处理结果会显示在这里' : ''"
        />

        <section v-else-if="canShowTree" class="json-tree-panel">
          <div class="json-tree-toolbar">
            <p class="meta-hint">对象与数组支持逐层折叠，适合查看大段 JSON 的局部结构。</p>
            <div class="json-tree-actions">
              <button type="button" class="ghost-button small-button" @click="openFullscreenPreview">全屏预览</button>
              <button type="button" class="ghost-button small-button" @click="expandTree">全部展开</button>
              <button type="button" class="ghost-button small-button" @click="collapseTree">全部收起</button>
            </div>
          </div>

          <div class="json-tree-scroll">
            <JsonTreeNode :key="treeRenderKey" :value="structuredOutput" :default-open-depth="treeOpenDepth" :is-root="true" />
          </div>
        </section>

        <div v-else class="empty-panel">
          <p>先格式化、压缩或校验有效 JSON，右侧才能展示可折叠结构。</p>
        </div>
      </section>
    </div>

    <div v-if="fullscreenPreviewOpen" class="json-tree-modal-backdrop" @click.self="closeFullscreenPreview">
      <section class="json-tree-modal" @click.stop>
        <div class="json-tree-modal-header">
          <div class="json-tree-modal-copy">
            <h3 class="pane-title">结构化全屏预览</h3>
            <p class="meta-hint">适合查看大体量 JSON 的完整结构，按 `Esc` 可快速关闭。</p>
          </div>

          <div class="json-tree-modal-actions">
            <button type="button" class="ghost-button small-button" @click="expandFullscreenTree">全部展开</button>
            <button type="button" class="ghost-button small-button" @click="collapseFullscreenTree">全部收起</button>
            <button type="button" class="ghost-button small-button" @click="closeFullscreenPreview">关闭</button>
          </div>
        </div>

        <div class="json-tree-modal-body">
          <JsonTreeNode
            :key="fullscreenTreeRenderKey"
            :value="structuredOutput"
            :default-open-depth="fullscreenTreeOpenDepth"
            :is-root="true"
          />
        </div>
      </section>
    </div>
  </section>
</template>
