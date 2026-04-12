import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const calculatorProMeta: ToolModuleMeta = {
  id: 'calculator-pro',
  title: 'Calculator Pro',
  category: '计算',
  group: 'utility',
  path: '/tools/calculator-pro',
  description: '计算表达式、折扣、税率和均摊结果，并保留历史记录。',
  keywords: ['calculator', 'math', 'discount', 'tax', 'split'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 21,
}
