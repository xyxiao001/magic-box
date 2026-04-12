<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage } from '@/lib/storage'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDownload } from '@/tool-runtime/composables/useToolDownload'
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
  buildDiffStudioDownloadPayload,
  buildDiffStudioHistoryLabel,
  createDiffStudioInitialInput,
  diffStudioRuntimeModule,
  type DiffStudioInput,
  type DiffStudioOutput,
} from './module'

const storageLeftKey = 'magic-box.diff-studio.left'
const storageRightKey = 'magic-box.diff-studio.right'
const storageLeftDomain = 'tool-history:diff-studio:left'
const storageRightDomain = 'tool-history:diff-studio:right'

const state = useToolState<DiffStudioInput, DiffStudioOutput>(diffStudioRuntimeModule)
const draft = useToolDraft(diffStudioRuntimeModule, state, {
  legacyKeys: [storageLeftDomain, storageLeftKey],
  parseLegacy: (raw, legacyKey) => {
    if (legacyKey === storageLeftDomain || legacyKey === storageLeftKey) {
      return {
        ...state.input.value,
        leftInput: raw,
      }
    }

    return undefined
  },
})

const legacyRight = readStorage(storageRightDomain, createDiffStudioInitialInput().rightInput, {
  legacyKeys: [storageRightKey],
  parseLegacy: (raw) => raw,
})

if (state.input.value.rightInput === createDiffStudioInitialInput().rightInput) {
  state.input.value.rightInput = legacyRight
}

const history = useToolHistory(diffStudioRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildDiffStudioHistoryLabel(output) : '文本对比',
    description: output ? `${output.diff.stats.added} 新增 / ${output.diff.stats.removed} 删除` : '',
  }),
})
const { run } = useToolExecution(diffStudioRuntimeModule, state)
const samples = useToolSamples(diffStudioRuntimeModule, state)
const download = useToolDownload(diffStudioRuntimeModule, state, {
  buildPayload: (_, output) => buildDiffStudioDownloadPayload(output),
})
const share = useToolShare(diffStudioRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const restoredSharedState = share.restoreSharedState()
const diffResult = computed(() => state.output.value?.diff)
const diffStatus = computed(() => {
  if (!state.input.value.leftInput.trim() && !state.input.value.rightInput.trim()) {
    return '等待输入左右内容'
  }

  if (diffResult.value?.identical) {
    return '两侧内容完全一致'
  }

  return '已计算行级差异'
})

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
  void run()
}

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  if (success) {
    showSuccessMessage(`${label}已复制`)
    return
  }
  showErrorMessage('当前环境不支持复制')
}

function clearAll() {
  draft.clearDraft()
  state.input.value.leftInput = ''
  state.input.value.rightInput = ''
  state.output.value = null
  state.error.value = null
}

function saveSnapshot() {
  if (!state.output.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

onMounted(() => {
  if (!restoredSharedState) {
    void run()
  }
})
</script>

<template>
  <ToolScaffold :meta="diffStudioRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="!state.input.value.leftInput" @click="copyValue(state.input.value.leftInput, '左侧内容')">复制左侧</button>
        <button type="button" class="ghost-button" :disabled="!state.input.value.rightInput" @click="copyValue(state.input.value.rightInput, '右侧内容')">复制右侧</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="原始内容" subtitle="左边放旧版本，右边放新版本，自动计算逐行差异。">
        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <div class="json-diff-editor-grid">
          <label class="field-row">
            <span class="field-label">左侧内容</span>
            <textarea v-model="state.input.value.leftInput" class="text-area text-area-full diff-textarea" spellcheck="false" placeholder="粘贴旧版本内容" />
          </label>

          <label class="field-row">
            <span class="field-label">右侧内容</span>
            <textarea v-model="state.input.value.rightInput" class="text-area text-area-full diff-textarea" spellcheck="false" placeholder="粘贴新版本内容" />
          </label>
        </div>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的文本差异。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<DiffStudioInput, DiffStudioOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="新版本与差异" :subtitle="diffStatus">
        <ToolPanel title="差异统计" subtitle="先看改动量，再决定要不要继续逐行排查。">
          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">新增</span>
                <strong class="result-value">{{ diffResult?.stats.added ?? 0 }}</strong>
              </div>
              <div>
                <span class="result-label">删除</span>
                <strong class="result-value">{{ diffResult?.stats.removed ?? 0 }}</strong>
              </div>
            </article>
            <article class="data-row">
              <div>
                <span class="result-label">未变化</span>
                <strong class="result-value">{{ diffResult?.stats.unchanged ?? 0 }}</strong>
              </div>
              <div>
                <span class="result-label">状态</span>
                <strong class="result-value">{{ diffResult?.identical ? '一致' : '存在差异' }}</strong>
              </div>
            </article>
          </div>
        </ToolPanel>

        <ToolPanel title="逐行差异" subtitle="新增行看右侧，删除行看左侧，相同行双侧对照。">
          <div v-if="diffResult?.rows.length" class="diff-grid">
            <article
              v-for="(row, index) in diffResult.rows"
              :key="`${row.type}-${index}`"
              class="diff-row"
              :data-type="row.type"
            >
              <div class="diff-cell">
                <span class="diff-line-number">{{ row.leftLineNumber ?? '—' }}</span>
                <code class="diff-code">{{ row.leftText || ' ' }}</code>
              </div>
              <div class="diff-cell">
                <span class="diff-line-number">{{ row.rightLineNumber ?? '—' }}</span>
                <code class="diff-code">{{ row.rightText || ' ' }}</code>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>输入内容后，这里会显示逐行对比结果。</p>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
