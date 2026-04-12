<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
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
import { compareTargetHash } from './logic'
import {
  buildHashStudioDownloadPayload,
  buildHashStudioHistoryLabel,
  executeHashStudio,
  hashStudioRuntimeModule,
  type HashStudioInput,
  type HashStudioOutput,
  type HashStudioSourceMode,
} from './module'

const legacyStorageKey = 'magic-box.hash-studio.text'
const fileInput = ref<HTMLInputElement | null>(null)
const sourceMode = ref<HashStudioSourceMode>('text')
const selectedFile = ref<File | null>(null)

const runtimeModule = {
  ...hashStudioRuntimeModule,
  execute: (input: HashStudioInput) =>
    executeHashStudio(input, {
      sourceMode: sourceMode.value,
      selectedFile: selectedFile.value,
    }),
}

const state = useToolState<HashStudioInput, HashStudioOutput>(runtimeModule)
const draft = useToolDraft(runtimeModule, state, {
  legacyKeys: ['tool-history:hash-studio:text', legacyStorageKey],
  parseLegacy: (raw) => ({
    textInput: raw,
    targetHash: '',
  }),
})
const history = useToolHistory(runtimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label: buildHashStudioHistoryLabel(input),
    description: output?.rows[0]?.value.slice(0, 16) ?? '最近一次文本哈希结果',
  }),
})
const { run } = useToolExecution(runtimeModule, state, {
  onSuccess: ({ input, output }) => {
    if (output.sourceType === 'text') {
      history.recordHistory(input, output)
    }
  },
})
const download = useToolDownload(runtimeModule, state, {
  buildPayload: (input, output) => buildHashStudioDownloadPayload(input, output),
})
const samples = useToolSamples(runtimeModule, state)
const share = useToolShare(runtimeModule, state, {
  buildShareState: (input) => (sourceMode.value === 'text' ? input : null),
  applySharedState: (sharedState) => {
    sourceMode.value = 'text'
    selectedFile.value = null
    state.input.value = sharedState
  },
  onRestored: () => {
    void run()
  },
})
const { info: showInfoMessage } = useMessage()

const rows = computed(() => state.output.value?.rows ?? [])
const compareResult = computed(() => compareTargetHash(state.input.value.targetHash, rows.value))
const statusMessage = computed(() => {
  if (state.loading.value) {
    return '计算中...'
  }

  if (state.error.value) {
    return state.error.value
  }

  if (!state.output.value) {
    return '输入文本或选择文件后，将在本地计算多种哈希值'
  }

  if (state.output.value.sourceType === 'file' && state.output.value.fileMeta) {
    return `已计算 ${state.output.value.fileMeta.name} 的哈希结果`
  }

  return '文本哈希已更新'
})
const statusTone = computed<'neutral' | 'success' | 'danger'>(() => {
  if (state.error.value) {
    return 'danger'
  }

  if (state.output.value) {
    return 'success'
  }

  return 'neutral'
})

watch(
  () => state.input.value.textInput,
  () => {
    if (sourceMode.value === 'text') {
      void run()
    }
  }
)

function switchToTextMode() {
  sourceMode.value = 'text'
  selectedFile.value = null
  void run()
}

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    selectedFile.value = file
    sourceMode.value = 'file'
    void run()
  }

  target.value = ''
}

function restoreHistory(entry: ToolHistoryEntry<HashStudioInput, HashStudioOutput>) {
  sourceMode.value = 'text'
  selectedFile.value = null
  history.restoreEntry(entry)
}

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)

  if (!sample) {
    return
  }

  sourceMode.value = 'text'
  selectedFile.value = null
  samples.applySample(sample)
  void run()
}

function clearAll() {
  draft.clearDraft()
  sourceMode.value = 'text'
  selectedFile.value = null
  state.input.value = {
    textInput: '',
    targetHash: '',
  }
  state.output.value = null
  state.error.value = null
}

const restoredSharedState = share.restoreSharedState()

onMounted(() => {
  if (!restoredSharedState) {
    void run()
  }
})
</script>

<template>
  <ToolScaffold :meta="runtimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :aria-pressed="sourceMode === 'text'" @click="switchToTextMode">文本模式</button>
        <button type="button" class="ghost-button" :aria-pressed="sourceMode === 'file'" @click="openFilePicker">文件模式</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell
        title="输入源"
        subtitle="支持文本和单文件两种模式，全部在浏览器本地计算。"
        :badge="sourceMode === 'text' ? '文本模式' : '文件模式'"
      >
        <label class="field-row">
          <span class="field-label">文本输入</span>
          <textarea
            v-model="state.input.value.textInput"
            class="text-area text-area-full"
            spellcheck="false"
            :disabled="sourceMode !== 'text'"
            placeholder="输入任意文本后，即可计算 MD5 / SHA-1 / SHA-256 / SHA-512"
          />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <ToolPanel title="文件输入" subtitle="适合校验下载文件、构建产物和压缩包是否一致。">
          <div class="hash-file-dropzone">
            <strong>{{ state.output.value?.fileMeta?.name || '选择一个文件进行哈希计算' }}</strong>
            <p>
              {{
                state.output.value?.fileMeta
                  ? `${state.output.value.fileMeta.type} · ${state.output.value.fileMeta.size}`
                  : '不会上传文件，只在本地读取和计算。'
              }}
            </p>
            <div class="input-toolbar">
              <button type="button" class="solid-button" @click="openFilePicker">选择文件</button>
              <button type="button" class="ghost-button" @click="switchToTextMode">回到文本模式</button>
            </div>
            <input ref="fileInput" class="hash-file-input" type="file" @change="handleFileChange" />
          </div>
        </ToolPanel>

        <label class="field-row">
          <span class="field-label">目标 Hash</span>
          <input
            v-model="state.input.value.targetHash"
            class="text-input"
            type="text"
            placeholder="粘贴目标 hash 后自动比对"
          />
        </label>

        <p
          class="helper-text"
          :class="{
            'helper-text-success': statusTone === 'success',
            'helper-text-danger': statusTone === 'danger',
          }"
        >
          {{ statusMessage }}
        </p>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="文本模式成功计算后，这里会记录最近的哈希快照。"
        @restore="(entry) => restoreHistory(entry as ToolHistoryEntry<HashStudioInput, HashStudioOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="哈希结果" subtitle="先看算法和值，再用目标 hash 快速判断是否一致。">
        <div class="hash-summary-grid">
          <ResultCard title="比对状态" subtitle="大小写不敏感，直接对比完整值。" :tone="compareResult.matched ? 'success' : 'neutral'">
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">目标值</span>
                  <strong class="result-value">{{ compareResult.normalizedTarget || '—' }}</strong>
                </div>
              </article>

              <article class="data-row">
                <div>
                  <span class="result-label">匹配结果</span>
                  <strong class="result-value">
                    {{
                      compareResult.normalizedTarget
                        ? compareResult.matched
                          ? `匹配 ${compareResult.matchedAlgorithm}`
                          : '未匹配'
                        : '等待输入目标 hash'
                    }}
                  </strong>
                </div>
              </article>
            </div>
          </ResultCard>

          <ResultCard title="当前来源" :subtitle="state.output.value?.sourceType === 'file' ? '当前结果来自文件输入' : '当前结果来自文本输入'">
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">来源</span>
                  <strong class="result-value">{{ state.output.value?.sourceLabel || '—' }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>
        </div>

        <ToolPanel title="算法结果" subtitle="每项都可单独复制，长度字段方便快速判断类型。">
          <div v-if="rows.length" class="hash-result-list">
            <ResultCard
              v-for="row in rows"
              :key="row.algorithm"
              :title="row.algorithm"
              :copy-value="row.value"
              :copy-label="`复制 ${row.algorithm}`"
              @copied="(success) => (success ? showInfoMessage(`${row.algorithm} 已复制`) : showInfoMessage('当前环境不支持复制'))"
            >
              <div class="data-list">
                <article class="data-row">
                  <div>
                    <span class="result-label">长度</span>
                    <strong class="result-value">{{ row.length }}</strong>
                  </div>
                </article>
              </div>
              <code class="package-command-code hash-code">{{ row.value }}</code>
            </ResultCard>
          </div>
          <div v-else class="empty-panel">
            <p>输入文本或选择文件后，这里会显示结果。</p>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>

<style scoped>
.hash-summary-grid,
.hash-result-list {
  display: grid;
  gap: 0.875rem;
}

.hash-summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.hash-file-dropzone {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px dashed var(--surface-card-border);
  border-radius: 16px;
  background: var(--surface-card-bg);
}

.hash-file-dropzone p {
  margin: 0;
  color: var(--muted);
}

.hash-file-input {
  display: none;
}

.hash-code {
  display: block;
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .hash-summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
