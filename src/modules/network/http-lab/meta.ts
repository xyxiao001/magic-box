import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const httpLabMeta: ToolModuleMeta = {
  id: 'http-lab',
  title: 'HTTP Lab',
  category: '接口',
  group: 'network',
  path: '/tools/http-lab',
  description: '构造请求、调试响应并查看状态码、响应头和响应体。',
  keywords: ['http', 'api', 'fetch', 'request', 'response'],
  tags: ['network-required', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'download-output', 'sample-data', 'share-url'],
  order: 6,
}
