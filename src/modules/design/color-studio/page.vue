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
import {
  buildColorStudioDownloadPayload,
  buildColorStudioHistoryLabel,
  colorStudioRuntimeModule,
  type ColorStudioInput,
  type ColorStudioOutput,
} from './module'

const storageKey = 'magic-box.color-studio.state'
const storageDomain = 'tool-history:color-studio:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<ColorStudioInput>
  } catch {
    return undefined
  }
}

const state = useToolState<ColorStudioInput, ColorStudioOutput>(colorStudioRuntimeModule)
const draft = useToolDraft(colorStudioRuntimeModule, state, {
  legacyKeys: [storageDomain, storageKey],
  parseLegacy: (raw) => ({
    ...state.input.value,
    ...parseSavedState(raw),
  }),
})
const history = useToolHistory(colorStudioRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildColorStudioHistoryLabel(output) : '颜色快照',
    description: output?.gradientCss || '',
  }),
})
const { run } = useToolExecution(colorStudioRuntimeModule, state)
const samples = useToolSamples(colorStudioRuntimeModule, state)
const download = useToolDownload(colorStudioRuntimeModule, state, {
  buildPayload: (_, output) => buildColorStudioDownloadPayload(output),
})
const share = useToolShare(colorStudioRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const restoredSharedState = share.restoreSharedState()
const output = computed(() => state.output.value)

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

function handleColorPickerInput(event: Event) {
  state.input.value.colorInput = (event.target as HTMLInputElement).value
}

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
  state.input.value.colorInput = ''
  state.input.value.gradientTarget = ''
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
  <ToolScaffold :meta="colorStudioRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="!output?.baseHex" @click="copyValue(output?.baseHex || '', 'HEX')">复制 HEX</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="颜色输入" subtitle="支持 HEX、rgb()、hsl()，同时可直接用颜色选择器取值。">
        <div class="color-input-group">
          <input :value="output?.baseHex || '#3366FF'" class="color-picker-input" type="color" @input="handleColorPickerInput" />

          <label class="field-row">
            <span class="field-label">基础颜色</span>
            <input
              v-model="state.input.value.colorInput"
              class="text-input"
              type="text"
              placeholder="#3366FF / rgb(51, 102, 255) / hsl(225 100% 60%)"
            />
          </label>
        </div>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">渐变终点</span>
            <input v-model="state.input.value.gradientTarget" class="text-input" type="text" placeholder="#FF7A59" />
          </label>

          <label class="field-row">
            <span class="field-label">角度</span>
            <input v-model.number="state.input.value.angle" class="slider-input" type="range" min="0" max="360" />
            <span class="meta-hint">{{ state.input.value.angle }}°</span>
          </label>
        </div>

        <p class="helper-text" :class="{ 'helper-text-danger': !output?.baseOk || !output?.gradientOk }">
          {{ !output?.baseOk ? output?.baseError || '请输入颜色' : !output?.gradientOk ? '渐变终点颜色格式无效' : '颜色已解析，可继续复制格式、配色和渐变 CSS' }}
        </p>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的颜色结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<ColorStudioInput, ColorStudioOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="配色与预览" subtitle="先看色板和渐变，再确认文字对比度是否满足真实使用场景。">
        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">格式转换</span>
          </div>
          <div class="data-list">
            <article class="data-row">
              <div><span class="result-label">HEX</span><strong class="result-value">{{ output?.baseHex || '—' }}</strong></div>
              <button type="button" class="ghost-button small-button" @click="copyValue(output?.baseHex || '', 'HEX')">复制</button>
            </article>
            <article class="data-row">
              <div><span class="result-label">RGB</span><strong class="result-value">{{ output?.baseRgb || '—' }}</strong></div>
              <button type="button" class="ghost-button small-button" @click="copyValue(output?.baseRgb || '', 'RGB')">复制</button>
            </article>
            <article class="data-row">
              <div><span class="result-label">HSL</span><strong class="result-value">{{ output?.baseHsl || '—' }}</strong></div>
              <button type="button" class="ghost-button small-button" @click="copyValue(output?.baseHsl || '', 'HSL')">复制</button>
            </article>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">色板方案</span>
          </div>
          <div class="color-scheme-grid">
            <article v-for="entry in output?.schemes || []" :key="entry.label" class="color-card">
              <div class="color-swatch" :style="{ background: entry.hex }"></div>
              <strong>{{ entry.label }}</strong>
              <span class="meta-hint">{{ entry.hex }}</span>
              <button type="button" class="ghost-button small-button" @click="copyValue(entry.hex, entry.label)">复制</button>
            </article>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">渐变预览</span>
            <button type="button" class="ghost-button small-button" @click="copyValue(output?.gradientCss || '', '渐变 CSS')">复制 CSS</button>
          </div>
          <div class="gradient-preview-shell">
            <div class="gradient-preview" :style="{ background: output?.gradientCss || '' }"></div>
          </div>
          <code class="package-command-code">{{ output?.gradientCss }}</code>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">对比度检查</span>
          </div>
          <div class="contrast-grid">
            <article class="contrast-card contrast-card-light">
              <div class="contrast-sample" :style="{ color: output?.baseHex || '#3366FF', background: '#FFFFFF' }">Magic Box</div>
              <strong>{{ output?.contrastWithWhite?.toFixed(2) }} · {{ output ? (output.contrastWithWhite >= 7 ? 'AAA' : output.contrastWithWhite >= 4.5 ? 'AA' : output.contrastWithWhite >= 3 ? 'AA Large' : 'Fail') : '—' }}</strong>
              <span class="meta-hint">白底文字</span>
            </article>
            <article class="contrast-card contrast-card-dark">
              <div class="contrast-sample" :style="{ color: output?.baseHex || '#3366FF', background: '#111827' }">Magic Box</div>
              <strong>{{ output?.contrastWithDark?.toFixed(2) }} · {{ output ? (output.contrastWithDark >= 7 ? 'AAA' : output.contrastWithDark >= 4.5 ? 'AA' : output.contrastWithDark >= 3 ? 'AA Large' : 'Fail') : '—' }}</strong>
              <span class="meta-hint">深底文字</span>
            </article>
          </div>
        </section>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
