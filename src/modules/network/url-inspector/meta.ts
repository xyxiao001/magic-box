import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const urlInspectorMeta: ToolModuleMeta = {
  id: 'url-inspector',
  title: 'URL Inspector',
  category: '接口',
  group: 'network',
  path: '/tools/url-inspector',
  description: '拆解 URL、编辑 query 参数并重新生成链接，适合联调与回调排查。',
  keywords: ['url', 'query', 'params', 'redirect', 'callback', 'link'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'sample-data', 'share-url'],
  order: 7.5,
}
