<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { useMessage } from '@/shared/composables/useMessage'
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
  buildWebsocketLabHistoryLabel,
  websocketLabRuntimeModule,
  type WebsocketLabInput,
  type WebsocketLabOutput,
} from './module'

type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

interface WsLogEntry {
  id: string
  direction: 'in' | 'out' | 'system'
  time: string
  payload: string
}

const stateDomain = 'tool-history:websocket-lab:state'
const socket = ref<WebSocket | null>(null)
const logs = ref<WsLogEntry[]>([])
const status = ref<ConnectionStatus>('idle')
const statusMessage = ref('尚未连接')
const toastMessage = ref('')
const heartbeatTimer = ref<number | null>(null)

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<WebsocketLabInput>
  } catch {
    return undefined
  }
}

const state = useToolState<WebsocketLabInput, WebsocketLabOutput>(websocketLabRuntimeModule)
useToolDraft(websocketLabRuntimeModule, state, {
  legacyKeys: [stateDomain, 'magic-box.websocket.state'],
  parseLegacy: (raw) => ({
    ...state.input.value,
    ...parseSavedState(raw),
  }),
})
const history = useToolHistory(websocketLabRuntimeModule, state, {
  buildEntryMeta: (input) => ({
    label: buildWebsocketLabHistoryLabel(input),
    description: input.heartbeatEnabled ? `heartbeat ${input.heartbeatInterval}s` : 'no heartbeat',
  }),
})
const { run } = useToolExecution(websocketLabRuntimeModule, state)
const samples = useToolSamples(websocketLabRuntimeModule, state)
const share = useToolShare(websocketLabRuntimeModule, state)
const { success: showSuccessMessage } = useMessage()

const statusLabel = computed(() => {
  if (status.value === 'open') return '已连接'
  if (status.value === 'connecting') return '连接中'
  if (status.value === 'error') return '错误'
  if (status.value === 'closed') return '已断开'
  return '未连接'
})

function addLog(direction: WsLogEntry['direction'], payload: string) {
  logs.value = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      direction,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      payload,
    },
    ...logs.value,
  ].slice(0, 200)
}

function clearLogs() {
  logs.value = []
}

function stopHeartbeat() {
  if (heartbeatTimer.value) {
    window.clearInterval(heartbeatTimer.value)
    heartbeatTimer.value = null
  }
}

function startHeartbeat() {
  stopHeartbeat()
  if (!state.input.value.heartbeatEnabled || status.value !== 'open') {
    return
  }

  const intervalMs = Math.max(3, Math.floor(state.input.value.heartbeatInterval)) * 1000
  heartbeatTimer.value = window.setInterval(() => {
    if (!socket.value || socket.value.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      socket.value.send(state.input.value.heartbeatPayload)
      addLog('out', `[heartbeat] ${state.input.value.heartbeatPayload}`)
    } catch {
      addLog('system', '[heartbeat] send failed')
    }
  }, intervalMs)
}

function disconnect() {
  stopHeartbeat()
  socket.value?.close()
  socket.value = null
  status.value = 'closed'
  statusMessage.value = '连接已断开'
}

function connect() {
  const url = state.input.value.url.trim()
  if (!url) {
    status.value = 'error'
    statusMessage.value = '请输入 WebSocket URL'
    return
  }

  disconnect()
  status.value = 'connecting'
  statusMessage.value = '正在连接...'

  const protocols = state.input.value.protocols
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  try {
    const ws = protocols.length ? new WebSocket(url, protocols) : new WebSocket(url)
    socket.value = ws

    ws.addEventListener('open', () => {
      status.value = 'open'
      statusMessage.value = '连接成功'
      addLog('system', 'connection opened')
      startHeartbeat()
    })

    ws.addEventListener('message', (event) => {
      const text = typeof event.data === 'string' ? event.data : `[binary ${event.data?.byteLength || 0} bytes]`
      addLog('in', text)
    })

    ws.addEventListener('close', () => {
      status.value = 'closed'
      statusMessage.value = '连接已关闭'
      addLog('system', 'connection closed')
      stopHeartbeat()
    })

    ws.addEventListener('error', () => {
      status.value = 'error'
      statusMessage.value = '连接发生错误（可能是 URL、证书或混合内容限制）'
      addLog('system', 'connection error')
      stopHeartbeat()
    })
  } catch {
    status.value = 'error'
    statusMessage.value = '无法创建 WebSocket，请检查 URL 格式'
  }
}

function sendMessage() {
  if (!socket.value || socket.value.readyState !== WebSocket.OPEN) {
    statusMessage.value = '当前未连接，无法发送消息'
    return
  }

  const payload = state.input.value.payload
  if (state.input.value.jsonMode) {
    try {
      const parsed = JSON.parse(payload)
      const formatted = JSON.stringify(parsed)
      socket.value.send(formatted)
      addLog('out', formatted)
    } catch {
      statusMessage.value = 'JSON 模式下消息必须是合法 JSON'
    }
    return
  }

  socket.value.send(payload)
  addLog('out', payload)
}

async function copyLog(entry: WsLogEntry) {
  const success = await copyToClipboard(entry.payload)
  toastMessage.value = success ? '日志已复制' : '当前环境不支持复制'
  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

watch(
  () => [
    state.input.value.url,
    state.input.value.protocols,
    state.input.value.heartbeatEnabled,
    state.input.value.heartbeatInterval,
    state.input.value.heartbeatPayload,
    state.input.value.jsonMode,
    state.input.value.payload,
  ],
  () => {
    void run()
    startHeartbeat()
  }
)

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
  void run()
}

function saveSnapshot() {
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

onMounted(() => {
  void run()
})

onBeforeUnmount(() => {
  disconnect()
})
</script>

<template>
  <ToolScaffold :meta="websocketLabRuntimeModule.meta" :loading="false" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="connect">连接</button>
        <button type="button" class="ghost-button" @click="disconnect">断开</button>
        <button type="button" class="ghost-button" @click="clearLogs">清空日志</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" @click="saveSnapshot">保存快照</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="连接配置" subtitle="浏览器 WebSocket 无法自定义 header，首版只支持 URL 与子协议。" :badge="statusLabel">
        <label class="field-row">
          <span class="field-label">URL</span>
          <input v-model="state.input.value.url" class="text-input" type="text" placeholder="ws:// 或 wss:// 地址" />
        </label>

        <label class="field-row">
          <span class="field-label">子协议</span>
          <input v-model="state.input.value.protocols" class="text-input" type="text" placeholder="可选，用逗号分隔，例如：json, v2" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">心跳</span>
          </div>
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">启用</span>
              <select v-model="state.input.value.heartbeatEnabled" class="select-input">
                <option :value="false">关闭</option>
                <option :value="true">开启</option>
              </select>
            </label>
            <label class="field-row">
              <span class="field-label">间隔(秒)</span>
              <input v-model.number="state.input.value.heartbeatInterval" class="text-input" type="number" min="3" />
            </label>
          </div>
          <label class="field-row">
            <span class="field-label">Payload</span>
            <input v-model="state.input.value.heartbeatPayload" class="text-input" type="text" />
          </label>
        </section>

        <p class="helper-text" :class="{ 'helper-text-danger': status === 'error' }">{{ statusMessage }}</p>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的 WebSocket 配置。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<WebsocketLabInput, WebsocketLabOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="消息与日志" :subtitle="statusMessage">
        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">发送消息</span>
            <span class="meta-hint">JSON 模式会先校验并压缩为单行。</span>
          </div>
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">JSON 模式</span>
              <select v-model="state.input.value.jsonMode" class="select-input">
                <option :value="false">关闭</option>
                <option :value="true">开启</option>
              </select>
            </label>
            <button type="button" class="solid-button" @click="sendMessage">发送</button>
          </div>
          <textarea v-model="state.input.value.payload" class="text-area text-area-compact" spellcheck="false" />
        </section>

        <section class="http-panel ws-log-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">收发日志</span>
            <span class="meta-hint">最多保留 200 条，新的在最上面。</span>
          </div>
          <div v-if="logs.length" class="ws-log-list">
            <article v-for="entry in logs" :key="entry.id" class="ws-log-row" :data-direction="entry.direction">
              <span class="ws-log-time">{{ entry.time }}</span>
              <span class="ws-log-tag">{{ entry.direction }}</span>
              <pre class="ws-log-payload">{{ entry.payload }}</pre>
              <button type="button" class="ghost-button small-button" @click="copyLog(entry)">复制</button>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>连接并收发消息后，这里会显示日志。</p>
          </div>
        </section>
      </ToolPaneShell>
    </template>
  </ToolScaffold>

  <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
</template>
