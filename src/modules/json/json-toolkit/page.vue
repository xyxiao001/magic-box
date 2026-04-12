<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import JsonTreeNode from '@/components/JsonTreeNode.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage, writeStorage } from '@/lib/storage'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDownload } from '@/tool-runtime/composables/useToolDownload'
import { useToolDraft } from '@/tool-runtime/composables/useToolDraft'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolHistory } from '@/tool-runtime/composables/useToolHistory'
import { useToolShare } from '@/tool-runtime/composables/useToolShare'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import {
  buildJsonToolkitDownloadPayload,
  type JsonToolkitInput,
  type JsonToolkitOutput,
  type JsonToolkitOutputTab,
  jsonToolkitRuntimeModule,
} from './module'

type OutputType = JsonToolkitOutput['outputType'] | 'empty'

const jsonToolkitStateDomain = 'tool-history:json-toolkit:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      source: string
      outputTab: JsonToolkitOutputTab
    }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<
  Partial<{
    outputTab: JsonToolkitOutputTab
  }>
>(jsonToolkitStateDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const state = useToolState<JsonToolkitInput, JsonToolkitOutput>(jsonToolkitRuntimeModule)
const draft = useToolDraft(jsonToolkitRuntimeModule, state, {
  legacyKeys: ['magic-box:v1:tool-history:json-toolkit:state'],
  parseLegacy: (raw) => {
    try {
      const parsed = JSON.parse(raw) as Partial<{
        source: string
      }>

      if (!parsed.source) {
        return undefined
      }

      return {
        source: parsed.source,
        action: 'format',
      }
    } catch {
      return undefined
    }
  },
})
const history = useToolHistory(jsonToolkitRuntimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label:
      input.action === 'format'
        ? 'JSON 格式化'
        : input.action === 'minify'
          ? 'JSON 压缩'
          : input.action === 'validate'
            ? 'JSON 校验'
            : '转 JS 对象',
    description: output?.statusMessage ?? '最近一次 JSON 处理结果',
  }),
})

const { run, reset } = useToolExecution(jsonToolkitRuntimeModule, state, {
  onSuccess: ({ input, output }) => {
    history.recordHistory(input, output)
  },
})
const download = useToolDownload(jsonToolkitRuntimeModule, state, {
  buildPayload: (input, output) => buildJsonToolkitDownloadPayload(input, output),
  buildSuccessMessage: (payload) => `已开始下载 ${payload.filename}`,
})
const share = useToolShare(jsonToolkitRuntimeModule, state, {
  buildShareState: (input) => ({
    input,
    outputTab: outputTab.value,
  }),
  applySharedState: (sharedState) => {
    state.input.value = sharedState.input
    outputTab.value = sharedState.outputTab ?? 'text'
  },
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage, info: showInfoMessage } = useMessage()

const outputTab = ref<JsonToolkitOutputTab>(savedState.outputTab ?? 'text')
const treeOpenDepth = ref(1)
const treeRenderKey = ref(0)
const fullscreenPreviewOpen = ref(false)
const fullscreenTreeOpenDepth = ref(2)
const fullscreenTreeRenderKey = ref(0)

share.restoreSharedState()

const outputText = computed(() => state.output.value?.text ?? '')
const outputType = computed<OutputType>(() => state.output.value?.outputType ?? 'empty')
const structuredOutput = computed(() => state.output.value?.structuredOutput ?? null)
const canUseOutput = computed(() => Boolean(outputText.value))
const canApplyOutput = computed(() => outputType.value === 'json' || outputType.value === 'js-object')
const canShowTree = computed(() => structuredOutput.value !== null)
const statusMessage = computed(() => state.error.value ?? state.output.value?.statusMessage ?? '准备就绪')
const statusTone = computed<'neutral' | 'success' | 'danger'>(() => {
  if (state.error.value) {
    return 'danger'
  }

  return state.output.value?.statusTone ?? 'neutral'
})
const outputMetrics = computed(() => {
  const text = outputText.value

  if (!text) {
    return []
  }

  return [
    `${text.length} 字符`,
    `${text.split('\n').length} 行`,
    outputType.value === 'js-object' ? 'JS 对象' : 'JSON 文本',
  ]
})

watch([() => state.input.value.source, outputTab], () => {
  writeStorage(jsonToolkitStateDomain, {
    outputTab: outputTab.value,
  })
})

function resetTree(openDepth = 1) {
  treeOpenDepth.value = openDepth
  treeRenderKey.value += 1
}

async function runAction(action: JsonToolkitInput['action']) {
  state.input.value.action = action
  const result = await run()

  if (!result) {
    return
  }

  outputTab.value = result.preferredTab
  resetTree(result.outputType === 'json' ? 1 : 2)
}

function useOutputAsInput() {
  if (!outputText.value) {
    return
  }

  state.input.value.source = outputText.value
  showInfoMessage('已应用到左侧输入区')
}

async function copyOutput() {
  const copied = await copyToClipboard(outputText.value)

  if (copied) {
    showSuccessMessage('输出已复制')
    return
  }

  showErrorMessage('当前环境不支持复制')
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
  <ToolScaffold :meta="jsonToolkitRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #input>
      <ToolPaneShell title="原始内容" subtitle="适合直接粘贴接口响应、配置文件和临时调试数据。">
        <textarea
          v-model="state.input.value.source"
          class="text-area text-area-full"
          spellcheck="false"
          placeholder='{"name":"magic-box"}'
        />
      </ToolPaneShell>
    </template>

    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="runAction('format')">格式化</button>
        <button type="button" class="ghost-button" @click="runAction('minify')">压缩</button>
        <button type="button" class="ghost-button" @click="runAction('validate')">校验</button>
        <button type="button" class="ghost-button" @click="runAction('convert-js-object')">转 JS 对象</button>
        <button type="button" class="ghost-button" :disabled="!canApplyOutput" @click="useOutputAsInput">应用到输入</button>
        <button type="button" class="ghost-button" :disabled="!canUseOutput" @click="copyOutput">复制输出</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载输出</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button
          v-if="draft.draftEnabled"
          type="button"
          class="ghost-button"
          @click="
            () => {
              draft.clearDraft()
              reset()
            }
          "
        >
          重置
        </button>
      </ToolActionBar>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="成功执行一次 JSON 处理后，这里会记录最近的结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<JsonToolkitInput, JsonToolkitOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="结果">
        <p
          class="helper-text"
          :class="{
            'helper-text-success': statusTone === 'success',
            'helper-text-danger': statusTone === 'danger',
          }"
        >
          {{ statusMessage }}
        </p>

        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="outputTab === 'text'" @click="outputTab = 'text'">
            文本结果
          </button>
          <button type="button" class="tab-button" :data-active="outputTab === 'tree'" :disabled="!canShowTree" @click="outputTab = 'tree'">
            结构预览
          </button>
          <span v-for="item in outputMetrics" :key="item" class="workspace-chip">{{ item }}</span>
        </div>

        <textarea
          v-if="outputTab === 'text'"
          :value="outputText"
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
      </ToolPaneShell>
    </template>
  </ToolScaffold>

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
</template>

<style scoped>
.json-output-area {
  min-height: 24rem;
}

@media (min-width: 1200px) {
  .json-output-area {
    min-height: 30rem;
  }
}
</style>
