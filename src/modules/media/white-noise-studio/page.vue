<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDraft } from '@/tool-runtime/composables/useToolDraft'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolHistory } from '@/tool-runtime/composables/useToolHistory'
import { useToolSamples } from '@/tool-runtime/composables/useToolSamples'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolSamplePanel from '@/tool-runtime/scaffolds/ToolSamplePanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import {
  buildWhiteNoiseStudioHistoryLabel,
  createWhiteNoiseStudioInitialInput,
  whiteNoiseStudioPresets,
  whiteNoiseStudioRuntimeModule,
  type WhiteNoiseStudioInput,
  type WhiteNoiseStudioOutput,
} from './module'

interface ActiveNode {
  gain: GainNode
  source: AudioNode & { start?: () => void; stop?: () => void; disconnect: () => void }
}

const noiseStateDomain = 'tool-history:white-noise-studio:state'
const context = ref<AudioContext | null>(null)
const masterGain = ref<GainNode | null>(null)
const remainingSeconds = ref(0)
const intervalId = ref<number | null>(null)
const activeNodes = new Map<string, ActiveNode>()

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      volume: number
      timerMinutes: number
      activeIds: string[]
    }>
  } catch {
    return undefined
  }
}

const state = useToolState<WhiteNoiseStudioInput, WhiteNoiseStudioOutput>(whiteNoiseStudioRuntimeModule)
const draft = useToolDraft(whiteNoiseStudioRuntimeModule, state, {
  legacyKeys: [noiseStateDomain],
  parseLegacy: (raw) => ({
    ...state.input.value,
    ...parseSavedState(raw),
  }),
})
const history = useToolHistory(whiteNoiseStudioRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildWhiteNoiseStudioHistoryLabel(output) : '环境音快照',
    description: output?.activeLabels.join(' + ') || '',
  }),
})
const { run } = useToolExecution(whiteNoiseStudioRuntimeModule, state)
const samples = useToolSamples(whiteNoiseStudioRuntimeModule, state)
const { success: showSuccessMessage, info: showInfoMessage } = useMessage()

const output = computed(() => state.output.value)
const timerLabel = computed(() => {
  if (remainingSeconds.value > 0) {
    const minutes = Math.floor(remainingSeconds.value / 60)
    const seconds = remainingSeconds.value % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return output.value?.timerLabel || '00:00'
})

function ensureAudioContext() {
  if (!context.value) {
    context.value = new AudioContext()
    masterGain.value = context.value.createGain()
    masterGain.value.gain.value = state.input.value.volume / 100
    masterGain.value.connect(context.value.destination)
  }

  return context.value
}

function createNoiseNode(audioContext: AudioContext, color: 'white' | 'pink' | 'brown') {
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate)
  const channel = buffer.getChannelData(0)
  let lastOut = 0

  for (let index = 0; index < channel.length; index += 1) {
    const white = Math.random() * 2 - 1

    if (color === 'pink') {
      lastOut = 0.98 * lastOut + 0.02 * white
      channel[index] = lastOut * 1.6
    } else if (color === 'brown') {
      lastOut = (lastOut + 0.02 * white) / 1.02
      channel[index] = lastOut * 3.5
    } else {
      channel[index] = white * 0.6
    }
  }

  const source = audioContext.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function createNode(id: string) {
  const preset = whiteNoiseStudioPresets.find((item) => item.id === id)
  if (!preset) return

  const audioContext = ensureAudioContext()
  const gain = audioContext.createGain()
  gain.gain.value = 0.28
  gain.connect(masterGain.value as GainNode)

  if (preset.type === 'noise') {
    const source = createNoiseNode(audioContext, preset.color || 'white')
    source.connect(gain)
    source.start()
    activeNodes.set(id, { gain, source })
    return
  }

  const oscillator = audioContext.createOscillator()
  oscillator.type = 'triangle'
  oscillator.frequency.value = preset.frequency || 180
  oscillator.connect(gain)
  oscillator.start()
  activeNodes.set(id, { gain, source: oscillator })
}

function stopNode(id: string) {
  const node = activeNodes.get(id)
  if (!node) return
  node.source.stop?.()
  node.source.disconnect()
  node.gain.disconnect()
  activeNodes.delete(id)
}

function syncActiveNodes(nextIds: string[]) {
  const currentIds = new Set(activeNodes.keys())
  nextIds.forEach((id) => {
    currentIds.delete(id)
    if (!activeNodes.has(id)) {
      createNode(id)
    }
  })

  currentIds.forEach((id) => stopNode(id))
}

async function togglePreset(id: string) {
  const isActive = state.input.value.activeIds.includes(id)
  const audioContext = ensureAudioContext()
  await audioContext.resume()
  state.input.value.activeIds = isActive
    ? state.input.value.activeIds.filter((item) => item !== id)
    : [...state.input.value.activeIds, id]
}

function stopAll() {
  state.input.value.activeIds.forEach((id) => stopNode(id))
  state.input.value.activeIds = []
  remainingSeconds.value = 0
  if (intervalId.value) {
    window.clearInterval(intervalId.value)
    intervalId.value = null
  }
}

function resetAll() {
  stopAll()
  draft.clearDraft()
  state.input.value = createWhiteNoiseStudioInitialInput()
  void run()
}

function startTimer() {
  if (intervalId.value) {
    window.clearInterval(intervalId.value)
  }

  remainingSeconds.value = Math.max(0, Math.floor(state.input.value.timerMinutes * 60))
  if (!remainingSeconds.value) return

  intervalId.value = window.setInterval(() => {
    remainingSeconds.value -= 1
    if (remainingSeconds.value <= 0) {
      stopAll()
    }
  }, 1000)
}

watch(
  () => state.input.value.volume,
  (value) => {
    if (masterGain.value) {
      masterGain.value.gain.value = value / 100
    }
  }
)

watch(
  () => state.input.value.activeIds,
  (value) => {
    syncActiveNodes(value)
    void run()
  },
  { deep: true }
)

watch(
  () => [state.input.value.volume, state.input.value.timerMinutes],
  () => {
    void run()
  }
)

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
  void run()
}

function saveSnapshot() {
  if (!state.output.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

onMounted(() => {
  void run()
})

onBeforeUnmount(() => {
  stopAll()
  context.value?.close()
})
</script>

<template>
  <ToolScaffold :meta="whiteNoiseStudioRuntimeModule.meta" :loading="false" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="startTimer">启动定时</button>
        <button type="button" class="ghost-button" @click="stopAll">全部停止</button>
        <button type="button" class="ghost-button" @click="resetAll">重置</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="环境音" subtitle="全部在本地生成，适合专注、写作、编码和放松场景。">
        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <div class="jwt-template-list">
          <button
            v-for="preset in whiteNoiseStudioPresets"
            :key="preset.id"
            type="button"
            class="http-template-card"
            :aria-pressed="state.input.value.activeIds.includes(preset.id)"
            @click="togglePreset(preset.id)"
          >
            <div class="http-template-top">
              <span class="http-template-method">NOISE</span>
              <span class="http-template-action">{{ state.input.value.activeIds.includes(preset.id) ? '停止' : '开始' }}</span>
            </div>
            <strong class="http-template-title">{{ preset.label }}</strong>
            <p class="http-template-summary">{{ preset.summary }}</p>
          </button>
        </div>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的环境音组合。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<WhiteNoiseStudioInput, WhiteNoiseStudioOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="播放控制" subtitle="可以调节总音量，并设置一个自动停止计时器。">
        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">总音量</span>
            <span class="meta-hint">{{ state.input.value.volume }}%</span>
          </div>
          <input v-model.number="state.input.value.volume" class="slider-input" type="range" min="0" max="100" />
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">定时停止</span>
            <span class="meta-hint">{{ remainingSeconds ? timerLabel : '未启动定时器' }}</span>
          </div>
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">分钟</span>
              <input v-model.number="state.input.value.timerMinutes" class="text-input" type="number" min="0" max="180" />
            </label>
            <div class="data-row">
              <div>
                <span class="result-label">当前播放</span>
                <strong class="result-value">{{ output?.activeLabels.join(' + ') || '未播放' }}</strong>
              </div>
            </div>
          </div>
          <p class="helper-text" @click="showInfoMessage('切换环境音后会立即在本地重新混音')">支持同时叠加多个环境音。</p>
        </section>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
