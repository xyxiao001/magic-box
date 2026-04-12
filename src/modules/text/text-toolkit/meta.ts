import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const textToolkitMeta: ToolModuleMeta = {
  id: 'text-toolkit',
  title: 'Text Toolkit',
  category: '文本',
  group: 'text',
  path: '/tools/text-toolkit',
  description: '处理大小写、去重排序、空白清洗和行前后缀追加。',
  keywords: ['text', 'trim', 'dedupe', 'sort', 'uppercase', 'lowercase'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 5.5,
}
