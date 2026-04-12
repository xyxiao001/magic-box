import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const jsonToolkitMeta: ToolModuleMeta = {
  id: 'json-toolkit',
  title: 'JSON Toolkit',
  category: 'JSON',
  group: 'json',
  path: '/tools/json-toolkit',
  description: '格式化、压缩、校验 JSON，并给出清晰错误提示。',
  keywords: ['json', 'format', 'minify', 'validate'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'share-url'],
  order: 1,
}
