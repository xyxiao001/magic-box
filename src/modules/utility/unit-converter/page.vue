<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { copyToClipboard } from '@/lib/clipboard'
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
import { unitCategories } from './logic'
import {
  buildUnitConverterDownloadPayload,
  buildUnitConverterHistoryLabel,
  createUnitConverterInitialInput,
  unitConverterRuntimeModule,
  type UnitConverterInput,
  type UnitConverterOutput,
} from './module'

const storageKey = 'magic-box.unit-converter.state'
const storageDomain = 'tool-history:unit-converter:state'

function parseStoredState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<UnitConverterInput>
  } catch {
    return undefined
  }
}

const state = useToolState<UnitConverterInput, UnitConverterOutput>(unitConverterRuntimeModule)
const draft = useToolDraft(unitConverterRuntimeModule, state, {
  legacyKeys: [storageDomain, storageKey],
  parseLegacy: (raw) => ({
    ...createUnitConverterInitialInput(),
    ...parseStoredState(raw),
  }),
})
const history = useToolHistory(unitConverterRuntimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label: output ? buildUnitConverterHistoryLabel(input, output) : '单位换算',
    description: output?.convertedResults[0]?.value || '',
  }),
})
const { run } = useToolExecution(unitConverterRuntimeModule, state)
const samples = useToolSamples(unitConverterRuntimeModule, state)
const download = useToolDownload(unitConverterRuntimeModule, state, {
  buildPayload: (_, output) => buildUnitConverterDownloadPayload(output),
})
const share = useToolShare(unitConverterRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const restoredSharedState = share.restoreSharedState()
const category = computed(() => unitCategories[state.input.value.category] || unitCategories.length)
const output = computed(() => state.output.value)

watch(
  () => state.input.value.category,
  (value) => {
    const firstUnit = Object.keys(unitCategories[value]?.units || {})[0]
    if (firstUnit) {
      state.input.value.unit = firstUnit
    }
  }
)

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

function saveSnapshot() {
  if (!state.output.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

function clearAll() {
  draft.clearDraft()
  state.input.value = createUnitConverterInitialInput()
  state.output.value = null
  state.error.value = null
}

onMounted(() => {
  if (!restoredSharedState) {
    void run()
  }
})
</script>

<template>
  <ToolScaffold :meta="unitConverterRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="!output?.convertedResults.length" @click="copyValue(`${state.input.value.value} ${category.units[state.input.value.unit]?.label}`, '源值')">复制源值</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">重置</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="单位换算" subtitle="覆盖长度、重量、温度、存储、速度等常见分类。">
        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">分类</span>
            <select v-model="state.input.value.category" class="select-input">
              <option v-for="(item, key) in unitCategories" :key="key" :value="key">{{ item.label }}</option>
            </select>
          </label>

          <label class="field-row">
            <span class="field-label">源单位</span>
            <select v-model="state.input.value.unit" class="select-input">
              <option v-for="(unit, key) in category.units" :key="key" :value="key">{{ unit.label }}</option>
            </select>
          </label>
        </div>

        <label class="field-row">
          <span class="field-label">数值</span>
          <input v-model.number="state.input.value.value" class="text-input" type="number" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的单位换算结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<UnitConverterInput, UnitConverterOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="换算结果" subtitle="所有结果实时更新，可按条复制。">
        <div class="converter-grid">
          <article v-for="entry in output?.convertedResults || []" :key="entry.unit" class="color-card">
            <span class="result-label">{{ entry.label }}</span>
            <strong class="result-value">{{ entry.value }}</strong>
            <button type="button" class="ghost-button small-button" @click="copyValue(`${entry.value} ${entry.label}`, entry.label)">复制</button>
          </article>
        </div>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
