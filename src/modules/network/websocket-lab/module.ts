import { websocketLabMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface WebsocketLabInput {
  url: string
  protocols: string
  heartbeatEnabled: boolean
  heartbeatInterval: number
  heartbeatPayload: string
  jsonMode: boolean
  payload: string
}

export interface WebsocketLabOutput {
  protocolCount: number
  heartbeatLabel: string
  payloadMode: string
}

export const websocketLabSamples: ToolSample<WebsocketLabInput>[] = [
  {
    id: 'echo-json',
    label: 'JSON Echo',
    summary: '适合测试 JSON 消息格式和单行发送。',
    apply: () => ({
      url: 'wss://echo.websocket.events',
      protocols: '',
      heartbeatEnabled: false,
      heartbeatInterval: 15,
      heartbeatPayload: 'ping',
      jsonMode: true,
      payload: '{"type":"ping"}',
    }),
  },
  {
    id: 'heartbeat',
    label: '心跳连接',
    summary: '适合验证心跳间隔和服务端保活行为。',
    apply: () => ({
      url: 'wss://echo.websocket.events',
      protocols: '',
      heartbeatEnabled: true,
      heartbeatInterval: 10,
      heartbeatPayload: 'ping',
      jsonMode: false,
      payload: 'hello websocket',
    }),
  },
]

export function createWebsocketLabInitialInput(): WebsocketLabInput {
  return {
    url: 'wss://echo.websocket.events',
    protocols: '',
    heartbeatEnabled: false,
    heartbeatInterval: 15,
    heartbeatPayload: 'ping',
    jsonMode: false,
    payload: '{"type":"ping"}',
  }
}

export function executeWebsocketLab(input: WebsocketLabInput): WebsocketLabOutput {
  const protocolCount = input.protocols
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean).length

  return {
    protocolCount,
    heartbeatLabel: input.heartbeatEnabled ? `${Math.max(3, Math.floor(input.heartbeatInterval))} 秒` : '关闭',
    payloadMode: input.jsonMode ? 'JSON' : 'Plain Text',
  }
}

export function buildWebsocketLabHistoryLabel(input: WebsocketLabInput) {
  return input.url || 'WebSocket 配置'
}

export const websocketLabRuntimeModule: Omit<ToolModule<WebsocketLabInput, WebsocketLabOutput>, 'page'> = {
  meta: websocketLabMeta,
  createInitialInput: createWebsocketLabInitialInput,
  execute: (input) => executeWebsocketLab(input),
  samples: websocketLabSamples,
}
