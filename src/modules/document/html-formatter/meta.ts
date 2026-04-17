import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const htmlFormatterMeta: ToolModuleMeta = {
  id: 'html-formatter',
  title: 'HTML Formatter',
  category: '文档',
  group: 'document',
  path: '/tools/html-formatter',
  description: '格式化或压缩 HTML，统一缩进并可按需补全 doctype。',
  keywords: ['html', 'markup', 'format', 'formatter', 'doctype', 'template'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 5.1,
}
