import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const markdownStudioMeta: ToolModuleMeta = {
  id: 'markdown-studio',
  title: 'Markdown Studio',
  category: '文档',
  group: 'document',
  path: '/tools/markdown-studio',
  description: '编辑 Markdown 并实时预览，内置常用模板与统计。',
  keywords: ['markdown', 'md', 'preview', 'editor', 'readme'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'sample-data', 'share-url'],
  order: 5,
}
