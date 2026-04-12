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
  buildCronPlannerDownloadPayload,
  buildCronPlannerHistoryLabel,
  createCronPlannerInitialInput,
  cronPlannerRuntimeModule,
  type CronPlannerInput,
  type CronPlannerOutput,
} from './module'

const storageKey = 'magic-box.cron-planner.state'
const storageDomain = 'tool-history:cron-planner:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      expression: string
      mode: CronPlannerInput['builder']['mode']
      minute: number
      hour: number
      weekday: number
    }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<ReturnType<typeof parseSavedState>>(storageDomain, undefined, {
  legacyKeys: [storageKey],
  parseLegacy: (raw) => parseSavedState(raw),
})

const state = useToolState<CronPlannerInput, CronPlannerOutput>(cronPlannerRuntimeModule)
const draft = useToolDraft(cronPlannerRuntimeModule, state)
if (savedState) {
  const initial = createCronPlannerInitialInput()
  if (state.input.value.expression === initial.expression) {
    state.input.value = {
      expression: savedState.expression ?? state.input.value.expression,
      builder: {
        mode: savedState.mode ?? state.input.value.builder.mode,
        minute: Number(savedState.minute ?? state.input.value.builder.minute),
        hour: Number(savedState.hour ?? state.input.value.builder.hour),
        weekday: Number(savedState.weekday ?? state.input.value.builder.weekday),
      },
    }
  }
}

const history = useToolHistory(cronPlannerRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildCronPlannerHistoryLabel(output) : 'Cron 快照',
    description: output?.parsed.description ?? '',
  }),
})
const { run } = useToolExecution(cronPlannerRuntimeModule, state)
const samples = useToolSamples(cronPlannerRuntimeModule, state)
const download = useToolDownload(cronPlannerRuntimeModule, state, {
  buildPayload: (_, output) => buildCronPlannerDownloadPayload(output),
})
const share = useToolShare(cronPlannerRuntimeModule, state, {
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

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
  void run()
}

function applyBuilderResult() {
  state.input.value.expression = output.value?.builderExpression ?? state.input.value.expression
}

async function copyExpression() {
  const success = await copyToClipboard(state.input.value.expression)
  if (success) {
    showSuccessMessage('Cron 表达式已复制')
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
  state.input.value = {
    ...createCronPlannerInitialInput(),
    expression: '',
  }
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
  <ToolScaffold :meta="cronPlannerRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="copyExpression">复制表达式</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="Cron 输入" subtitle="当前支持标准 5 段 cron：分钟 小时 日 月 星期。">
        <label class="field-row">
          <span class="field-label">Cron 表达式</span>
          <input v-model="state.input.value.expression" class="text-input" type="text" placeholder="例如：30 10 * * 1-5" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <ToolPanel title="生成器" subtitle="先选执行频率，再自动生成表达式。">
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">模式</span>
              <select v-model="state.input.value.builder.mode" class="select-input">
                <option value="hourly">每小时</option>
                <option value="daily">每天</option>
                <option value="weekdays">工作日</option>
                <option value="weekly">每周</option>
              </select>
            </label>

            <label class="field-row">
              <span class="field-label">分钟</span>
              <input v-model.number="state.input.value.builder.minute" class="slider-input" type="range" min="0" max="59" />
              <span class="meta-hint">{{ state.input.value.builder.minute }}</span>
            </label>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">小时</span>
              <input v-model.number="state.input.value.builder.hour" class="slider-input" type="range" min="0" max="23" />
              <span class="meta-hint">{{ state.input.value.builder.hour }}</span>
            </label>

            <label v-if="state.input.value.builder.mode === 'weekly'" class="field-row">
              <span class="field-label">星期</span>
              <select v-model.number="state.input.value.builder.weekday" class="select-input">
                <option :value="0">周日</option>
                <option :value="1">周一</option>
                <option :value="2">周二</option>
                <option :value="3">周三</option>
                <option :value="4">周四</option>
                <option :value="5">周五</option>
                <option :value="6">周六</option>
              </select>
            </label>
          </div>

          <article class="data-row">
            <div>
              <span class="result-label">生成结果</span>
              <strong class="result-value">{{ output?.builderExpression || '—' }}</strong>
            </div>
            <button type="button" class="solid-button" @click="applyBuilderResult">应用到输入框</button>
          </article>
        </ToolPanel>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的 cron 解释结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<CronPlannerInput, CronPlannerOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="解释与触发时间" :subtitle="output?.parsed.description || output?.parsed.error || '等待输入 cron 表达式'">
        <ToolPanel title="自然语言解释">
          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">解释</span>
                <strong class="result-value">{{ output?.parsed.description || '—' }}</strong>
              </div>
            </article>
            <article class="data-row">
              <div>
                <span class="result-label">表达式</span>
                <strong class="result-value">{{ output?.parsed.expression || '—' }}</strong>
              </div>
            </article>
          </div>
        </ToolPanel>

        <ToolPanel title="未来 6 次触发" subtitle="按当前浏览器本地时间计算。">
          <div v-if="output?.upcomingRuns.length" class="timeline-list">
            <article v-for="(item, index) in output.upcomingRuns" :key="item" class="timeline-row">
              <span class="timeline-index">{{ index + 1 }}</span>
              <strong class="result-value">{{ item }}</strong>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>表达式合法后，这里会显示未来触发时间。</p>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
