import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const requestConverterMeta: ToolModuleMeta = {
  id: 'request-converter',
  title: 'Request Converter',
  category: '接口',
  group: 'network',
  path: '/tools/request-converter',
  description: '解析 cURL 并生成 fetch/axios/node-fetch 代码片段。',
  keywords: ['curl', 'fetch', 'axios', 'request', 'snippet'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 7,
}
