import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const codecLabMeta: ToolModuleMeta = {
  id: 'codec-lab',
  title: 'Codec Lab',
  category: '编码',
  group: 'encoding',
  path: '/tools/codec-lab',
  description: 'Base64 与 URL 编解码，适合接口调试和临时转换。',
  keywords: ['base64', 'urlencode', 'decode', 'encode'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 3,
}
