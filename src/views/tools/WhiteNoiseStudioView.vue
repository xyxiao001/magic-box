<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { buildNoisePresets, formatTimerLabel } from '@/lib/noise-tool'

interface ActiveNode {
  gain: GainNode
  source: AudioNode & { start?: () => void; stop?: () => void; disconnect: () => void }
}

const presets = buildNoisePresets()
const context = ref<AudioContext | null>(null)
const masterGain = ref<GainNode | null>(null)
const activeIds = ref<string[]>([])
const volume = ref(60)
const timerMinutes = ref(0)
const remainingSeconds = ref(0)
const intervalId = ref<number | null>(null)
const activeNodes = new Map<string, ActiveNode>()

const timerLabel = computed(() => formatTimerLabel(remainingSeconds.value))

function ensureAudioContext() {
  if (!context.value) {
    context.value = new AudioContext()
    masterGain.value = context.value.createGain()
    masterGain.value.gain.value = volume.value / 100
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
  const preset = presets.find((item) => item.id === id)

  if (!preset) {
    return
  }

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

  if (!node) {
    return
  }

  node.source.stop?.()
  node.source.disconnect()
  node.gain.disconnect()
  activeNodes.delete(id)
}

async function togglePreset(id: string) {
  const isActive = activeIds.value.includes(id)

  if (isActive) {
    activeIds.value = activeIds.value.filter((item) => item !== id)
    stopNode(id)
    return
  }

  const audioContext = ensureAudioContext()
  await audioContext.resume()
  createNode(id)
  activeIds.value = [...activeIds.value, id]
}

function stopAll() {
  activeIds.value.forEach((id) => stopNode(id))
  activeIds.value = []
  remainingSeconds.value = 0
  if (intervalId.value) {
    window.clearInterval(intervalId.value)
    intervalId.value = null
  }
}

function startTimer() {
  if (intervalId.value) {
    window.clearInterval(intervalId.value)
  }

  remainingSeconds.value = Math.max(0, Math.floor(timerMinutes.value * 60))

  if (!remainingSeconds.value) {
    return
  }

  intervalId.value = window.setInterval(() => {
    remainingSeconds.value -= 1

    if (remainingSeconds.value <= 0) {
      stopAll()
    }
  }, 1000)
}

onBeforeUnmount(() => {
  stopAll()
  context.value?.close()
})

const activeCount = computed(() => activeIds.value.length)
</script>

<template>
  <section class="tool-page tool-page-noise">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">环境音</h2>
            <p class="meta-hint">全部在本地生成，适合专注、写作、编码和放松场景。</p>
          </div>
          <span class="workspace-chip">{{ activeCount }} 个正在播放</span>
        </div>

        <div class="jwt-template-list">
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            class="http-template-card"
            :aria-pressed="activeIds.includes(preset.id)"
            @click="togglePreset(preset.id)"
          >
            <div class="http-template-top">
              <span class="http-template-method">NOISE</span>
              <span class="http-template-action">{{ activeIds.includes(preset.id) ? '停止' : '开始' }}</span>
            </div>
            <strong class="http-template-title">{{ preset.label }}</strong>
            <p class="http-template-summary">{{ preset.summary }}</p>
          </button>
        </div>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">播放控制</h2>
            <p class="meta-hint">可以调节总音量，并设置一个自动停止计时器。</p>
          </div>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">总音量</span>
            <span class="meta-hint">{{ volume }}%</span>
          </div>

          <input
            v-model.number="volume"
            class="slider-input"
            type="range"
            min="0"
            max="100"
            @input="masterGain && (masterGain.gain.value = volume / 100)"
          />
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">定时停止</span>
            <span class="meta-hint">{{ remainingSeconds ? timerLabel : '未启动定时器' }}</span>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">分钟</span>
              <input v-model.number="timerMinutes" class="text-input" type="number" min="0" max="180" />
            </label>
            <div class="input-toolbar">
              <button type="button" class="solid-button" @click="startTimer">启动定时</button>
              <button type="button" class="ghost-button" @click="stopAll">全部停止</button>
            </div>
          </div>
        </section>
      </section>
    </div>
  </section>
</template>
