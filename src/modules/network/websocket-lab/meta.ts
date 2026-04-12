import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const websocketLabMeta: ToolModuleMeta = {
  id: 'websocket-lab',
  title: 'WebSocket Lab',
  category: '接口',
  group: 'network',
  path: '/tools/websocket-lab',
  description: '轻量 WebSocket 调试台：连接、发消息、心跳与日志。',
  keywords: ['websocket', 'ws', 'wss', 'realtime', 'debug'],
  tags: ['network-required', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'sample-data', 'share-url'],
  order: 13,
}
