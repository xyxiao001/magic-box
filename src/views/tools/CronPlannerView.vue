<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  buildCronFromBuilder,
  buildCronTemplates,
  getNextRunTimes,
  parseCronExpression,
  type CronBuilderState,
} from '@/lib/cron-tool'
import { readStorage, writeStorage } from '@/lib/storage'

const storageKey = 'magic-box.cron-planner.state'
const storageDomain = 'tool-history:cron-planner:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      expression: string
      mode: CronBuilderState['mode']
      minute: number
      hour: number
      weekday: number
    }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<
  Partial<{
    expression: string
    mode: CronBuilderState['mode']
    minute: number
    hour: number
    weekday: number
  }>
>(storageDomain, {}, {
  legacyKeys: [storageKey],
  parseLegacy: (raw) => parseSavedState(raw),
})

const expression = ref(savedState.expression || '30 10 * * 1-5')
const builderMode = ref<CronBuilderState['mode']>(savedState.mode || 'weekdays')
const builderMinute = ref(Number(savedState.minute ?? 30))
const builderHour = ref(Number(savedState.hour ?? 10))
const builderWeekday = ref(Number(savedState.weekday ?? 1))
const toastMessage = ref('')

const templates = buildCronTemplates()
const parsed = computed(() => parseCronExpression(expression.value))
const upcomingRuns = computed(() => getNextRunTimes(expression.value, 6, new Date()))
const builderExpression = computed(() =>
  buildCronFromBuilder({
    mode: builderMode.value,
    minute: builderMinute.value,
    hour: builderHour.value,
    weekday: builderWeekday.value,
  })
)

function applyTemplate(nextExpression: string) {
  expression.value = nextExpression
}

function applyBuilderResult() {
  expression.value = builderExpression.value
}

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  toastMessage.value = success ? `${label}已复制` : '当前环境不支持复制'

  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

watch([expression, builderMode, builderMinute, builderHour, builderWeekday], () => {
  writeStorage(storageDomain, {
    expression: expression.value,
    mode: builderMode.value,
    minute: builderMinute.value,
    hour: builderHour.value,
    weekday: builderWeekday.value,
  })
})
</script>

<template>
  <section class="tool-page tool-page-cron">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">Cron 输入</h2>
            <p class="meta-hint">当前只支持标准 5 段：分钟 小时 日 月 星期，按本地时区解释。</p>
          </div>
          <span class="workspace-chip">{{ parsed.ok ? '已解析' : '输入有误' }}</span>
        </div>

        <div class="input-toolbar">
          <button
            v-for="template in templates"
            :key="template.label"
            type="button"
            class="ghost-button small-button"
            @click="applyTemplate(template.expression)"
          >
            {{ template.label }}
          </button>
          <button type="button" class="ghost-button small-button" @click="copyValue(expression, 'Cron 表达式')">
            复制表达式
          </button>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">模板说明</span>
            <span class="meta-hint">覆盖小时级、每天、工作日、每周等常见场景。</span>
          </div>

          <div class="jwt-template-list">
            <button
              v-for="template in templates"
              :key="template.label"
              type="button"
              class="http-template-card"
              @click="applyTemplate(template.expression)"
            >
              <div class="http-template-top">
                <span class="http-template-method">CRON</span>
                <span class="http-template-action">应用模板</span>
              </div>
              <strong class="http-template-title">{{ template.label }}</strong>
              <p class="http-template-summary">{{ template.summary }}</p>
              <code class="http-template-url">{{ template.expression }}</code>
            </button>
          </div>
        </section>

        <label class="field-row">
          <span class="field-label">Cron 表达式</span>
          <input v-model="expression" class="text-input" type="text" placeholder="例如：30 10 * * 1-5" />
        </label>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">生成器</span>
            <span class="meta-hint">先选执行频率，再自动生成表达式。</span>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">模式</span>
              <select v-model="builderMode" class="select-input">
                <option value="hourly">每小时</option>
                <option value="daily">每天</option>
                <option value="weekdays">工作日</option>
                <option value="weekly">每周</option>
              </select>
            </label>

            <label class="field-row">
              <span class="field-label">分钟</span>
              <input v-model.number="builderMinute" class="slider-input" type="range" min="0" max="59" />
              <span class="meta-hint">{{ builderMinute }}</span>
            </label>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">小时</span>
              <input v-model.number="builderHour" class="slider-input" type="range" min="0" max="23" />
              <span class="meta-hint">{{ builderHour }}</span>
            </label>

            <label v-if="builderMode === 'weekly'" class="field-row">
              <span class="field-label">星期</span>
              <select v-model.number="builderWeekday" class="select-input">
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
              <strong class="result-value">{{ builderExpression }}</strong>
            </div>
            <button type="button" class="solid-button" @click="applyBuilderResult">应用到输入框</button>
          </article>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">解释与触发时间</h2>
            <p class="meta-hint">
              {{ parsed.ok ? parsed.description : parsed.error || '请输入合法 cron 表达式' }}
            </p>
          </div>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">自然语言解释</span>
            <span class="meta-hint">先确认表达式含义，再看后续触发时间是否符合预期。</span>
          </div>

          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">解释</span>
                <strong class="result-value">{{ parsed.description }}</strong>
              </div>
            </article>

            <article class="data-row">
              <div>
                <span class="result-label">表达式</span>
                <strong class="result-value">{{ parsed.expression || '—' }}</strong>
              </div>
            </article>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">未来 6 次触发</span>
            <span class="meta-hint">按当前浏览器本地时间计算。</span>
          </div>

          <div v-if="upcomingRuns.length" class="timeline-list">
            <article v-for="(item, index) in upcomingRuns" :key="item" class="timeline-row">
              <span class="timeline-index">{{ index + 1 }}</span>
              <strong class="result-value">{{ item }}</strong>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>表达式合法后，这里会显示未来触发时间。</p>
          </div>
        </section>
      </section>
    </div>

    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>
