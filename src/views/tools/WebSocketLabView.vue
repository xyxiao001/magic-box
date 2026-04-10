<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'

type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

interface WsLogEntry {
  id: string
  direction: 'in' | 'out' | 'system'
  time: string
  payload: string
}

const stateKey = 'magic-box.websocket.state'

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem(stateKey) || '{}') as Partial<{
      url: string
      protocols: string
      heartbeatEnabled: boolean
      heartbeatInterval: number
      heartbeatPayload: string
      jsonMode: boolean
    }>
  } catch {
    return {}
  }
})()

const urlInput = ref(saved.url || 'wss://echo.websocket.org')
const protocolsInput = ref(saved.protocols || '')
const jsonMode = ref(Boolean(saved.jsonMode))
const payloadInput = ref('{"type":"ping"}')
const status = ref<ConnectionStatus>('idle')
const statusMessage = ref('尚未连接')
const socket = ref<WebSocket | null>(null)
const logs = ref<WsLogEntry[]>([])
const toastMessage = ref('')

const heartbeatEnabled = ref(Boolean(saved.heartbeatEnabled))
const heartbeatInterval = ref(Number(saved.heartbeatInterval || 15))
const heartbeatPayload = ref(saved.heartbeatPayload || 'ping')
const heartbeatTimer = ref<number | null>(null)

const statusLabel = computed(() => {
  if (status.value === 'open') {
    return '已连接'
  }
  if (status.value === 'connecting') {
    return '连接中'
  }
  if (status.value === 'error') {
    return '错误'
  }
  if (status.value === 'closed') {
    return '已断开'
  }
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

  if (!heartbeatEnabled.value || status.value !== 'open') {
    return
  }

  const intervalMs = Math.max(3, Math.floor(heartbeatInterval.value)) * 1000

  heartbeatTimer.value = window.setInterval(() => {
    if (!socket.value || socket.value.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      socket.value.send(heartbeatPayload.value)
      addLog('out', `[heartbeat] ${heartbeatPayload.value}`)
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
  const url = urlInput.value.trim()

  if (!url) {
    status.value = 'error'
    statusMessage.value = '请输入 WebSocket URL'
    return
  }

  disconnect()
  status.value = 'connecting'
  statusMessage.value = '正在连接...'

  const protocols = protocolsInput.value
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

  const payload = payloadInput.value

  if (jsonMode.value) {
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

watch([urlInput, protocolsInput, heartbeatEnabled, heartbeatInterval, heartbeatPayload, jsonMode], () => {
  localStorage.setItem(
    stateKey,
    JSON.stringify({
      url: urlInput.value,
      protocols: protocolsInput.value,
      heartbeatEnabled: heartbeatEnabled.value,
      heartbeatInterval: heartbeatInterval.value,
      heartbeatPayload: heartbeatPayload.value,
      jsonMode: jsonMode.value,
    })
  )

  startHeartbeat()
})

onBeforeUnmount(() => {
  disconnect()
})
</script>

<template>
  <section class="tool-page tool-page-ws">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">连接配置</h2>
            <p class="meta-hint">浏览器 WebSocket 无法自定义 header，首版只支持 URL 与子协议。</p>
          </div>
          <span class="workspace-chip">{{ statusLabel }}</span>
        </div>

        <label class="field-row">
          <span class="field-label">URL</span>
          <input v-model="urlInput" class="text-input" type="text" placeholder="ws:// 或 wss:// 地址" />
        </label>

        <label class="field-row">
          <span class="field-label">子协议</span>
          <input v-model="protocolsInput" class="text-input" type="text" placeholder="可选，用逗号分隔，例如：json, v2" />
        </label>

        <div class="input-toolbar">
          <button type="button" class="solid-button" @click="connect">连接</button>
          <button type="button" class="ghost-button" @click="disconnect">断开</button>
          <button type="button" class="ghost-button" @click="clearLogs">清空日志</button>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">心跳</span>
            <span class="meta-hint">按间隔发送固定 payload，适合验证服务端 keep-alive 行为。</span>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">启用</span>
              <select v-model="heartbeatEnabled" class="select-input">
                <option :value="false">关闭</option>
                <option :value="true">开启</option>
              </select>
            </label>

            <label class="field-row">
              <span class="field-label">间隔(秒)</span>
              <input v-model.number="heartbeatInterval" class="text-input" type="number" min="3" />
            </label>
          </div>

          <label class="field-row">
            <span class="field-label">Payload</span>
            <input v-model="heartbeatPayload" class="text-input" type="text" />
          </label>
        </section>

        <p class="helper-text" :class="{ 'helper-text-danger': status === 'error' }">{{ statusMessage }}</p>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">消息与日志</h2>
            <p class="meta-hint">输入消息后发送，并在日志里查看收发情况。</p>
          </div>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">发送消息</span>
            <span class="meta-hint">JSON 模式会先校验并压缩为单行。</span>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">JSON 模式</span>
              <select v-model="jsonMode" class="select-input">
                <option :value="false">关闭</option>
                <option :value="true">开启</option>
              </select>
            </label>
            <button type="button" class="solid-button" @click="sendMessage">发送</button>
          </div>

          <textarea v-model="payloadInput" class="text-area text-area-compact" spellcheck="false" />
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
      </section>
    </div>

    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>

