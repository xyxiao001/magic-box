<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDraft } from '@/tool-runtime/composables/useToolDraft'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolHistory } from '@/tool-runtime/composables/useToolHistory'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import { nanoAlphabetPresets, type NanoAlphabetPreset } from './logic'
import {
  buildUuidValidationSummary,
  type UuidStudioInput,
  type UuidStudioOutput,
  uuidStudioRuntimeModule,
} from './module'

const state = useToolState<UuidStudioInput, UuidStudioOutput>(uuidStudioRuntimeModule)
const draft = useToolDraft(uuidStudioRuntimeModule, state, {
  legacyKeys: ['magic-box:v1:tool-history:uuid-studio:state'],
  parseLegacy: (raw) => {
    try {
      return JSON.parse(raw) as UuidStudioInput
    } catch {
      return undefined
    }
  },
})
const history = useToolHistory(uuidStudioRuntimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label: `${input.mode === 'uuid' ? 'UUID v4' : 'NanoID'} · ${output?.results.length ?? 0} 条`,
    description:
      output?.results[0] ??
      (input.mode === 'uuid' ? '最近一次 UUID 生成结果' : '最近一次 NanoID 生成结果'),
  }),
})

const { run, reset } = useToolExecution(uuidStudioRuntimeModule, state, {
  onSuccess: ({ input, output }) => {
    history.recordHistory(input, output)
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const results = computed(() => state.output.value?.results ?? [])
const validationSummary = computed(() => buildUuidValidationSummary(state.input.value))

async function copyValue(value: string, label: string) {
  const copied = await copyToClipboard(value)

  if (copied) {
    showSuccessMessage(`${label}已复制`)
    return
  }

  showErrorMessage('当前环境不支持复制')
}

function usePreset(preset: NanoAlphabetPreset) {
  state.input.value.alphabetPreset = preset
  state.input.value.customAlphabet = nanoAlphabetPresets[preset]
}

function clearValidation() {
  state.input.value.validationInput = ''
}

onMounted(() => {
  void run()
})
</script>

<template>
  <ToolScaffold :meta="uuidStudioRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #input>
      <ToolPaneShell title="生成配置" subtitle="支持 UUID v4 与 NanoID，适合批量生成测试数据、主键和临时标识。">
        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="state.input.value.mode === 'uuid'" @click="state.input.value.mode = 'uuid'">
            UUID v4
          </button>
          <button
            type="button"
            class="tab-button"
            :data-active="state.input.value.mode === 'nanoid'"
            @click="state.input.value.mode = 'nanoid'"
          >
            NanoID
          </button>
        </div>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">批量数量</span>
            <input v-model.number="state.input.value.batchCount" class="text-input" type="number" min="1" max="50" />
          </label>
          <label v-if="state.input.value.mode === 'nanoid'" class="field-row">
            <span class="field-label">长度</span>
            <input v-model.number="state.input.value.nanoLength" class="text-input" type="number" min="4" max="64" />
          </label>
        </div>

        <ToolPanel v-if="state.input.value.mode === 'nanoid'" title="字符集">
          <ToolActionBar>
            <button type="button" class="ghost-button small-button" @click="usePreset('default')">默认</button>
            <button type="button" class="ghost-button small-button" @click="usePreset('lowercase')">小写字母</button>
            <button type="button" class="ghost-button small-button" @click="usePreset('numbers')">纯数字</button>
            <button type="button" class="ghost-button small-button" @click="usePreset('hex')">Hex</button>
          </ToolActionBar>

          <label class="field-row">
            <span class="field-label">当前字符集</span>
            <textarea v-model="state.input.value.customAlphabet" class="text-area text-area-compact" spellcheck="false" />
          </label>
        </ToolPanel>

        <ToolPanel title="格式校验" subtitle="可快速判断一个 ID 是否符合当前模式。">
          <label class="field-row">
            <span class="field-label">待校验 ID</span>
            <textarea
              v-model="state.input.value.validationInput"
              class="text-area text-area-compact"
              spellcheck="false"
              placeholder="粘贴一个 UUID 或 NanoID"
            />
          </label>
          <p class="helper-text">{{ validationSummary }}</p>
        </ToolPanel>
      </ToolPaneShell>
    </template>

    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="run">生成</button>
        <button type="button" class="ghost-button" :disabled="!results.length" @click="copyValue(results.join('\n'), '全部结果')">
          复制全部
        </button>
        <button type="button" class="ghost-button" @click="clearValidation">清空校验</button>
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
        empty-text="生成一次结果后，这里会保存最近的 ID 快照。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<UuidStudioInput, UuidStudioOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="生成结果" subtitle="支持批量复制和逐条复制，可直接作为接口调试和测试数据输入。">
        <ResultCard
          title="结果摘要"
          :subtitle="`${state.input.value.mode === 'uuid' ? 'UUID v4' : 'NanoID'} · 共 ${results.length} 条`"
          :copy-value="results.join('\n')"
          copy-label="复制全部"
        >
          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">模式</span>
                <strong class="result-value">{{ state.input.value.mode === 'uuid' ? 'UUID v4' : 'NanoID' }}</strong>
              </div>
              <div>
                <span class="result-label">批量数量</span>
                <strong class="result-value">{{ results.length }}</strong>
              </div>
            </article>
            <article v-if="state.input.value.mode === 'nanoid'" class="data-row">
              <div>
                <span class="result-label">长度</span>
                <strong class="result-value">{{ state.input.value.nanoLength }}</strong>
              </div>
              <div>
                <span class="result-label">字符集长度</span>
                <strong class="result-value">{{ state.input.value.customAlphabet.length }}</strong>
              </div>
            </article>
          </div>
        </ResultCard>

        <ToolPanel title="结果列表" :subtitle="results.length ? '可逐条复制或整体复制。' : '点击生成后这里会出现结果。'">
          <div v-if="results.length" class="data-list">
            <article v-for="item in results" :key="item" class="data-row">
              <code class="mono-block">{{ item }}</code>
              <button type="button" class="ghost-button small-button" @click="copyValue(item, '单条结果')">复制</button>
            </article>
          </div>
          <p v-else class="meta-hint">当前还没有生成结果。</p>
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
