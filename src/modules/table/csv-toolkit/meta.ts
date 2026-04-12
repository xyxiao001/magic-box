import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const csvToolkitMeta: ToolModuleMeta = {
  id: 'csv-toolkit',
  title: 'CSV Toolkit',
  category: '表格',
  group: 'table',
  path: '/tools/csv-toolkit',
  description: '预览 CSV 表格，支持 CSV / JSON 双向转换与基础清洗。',
  keywords: ['csv', 'table', 'json', 'tsv', 'spreadsheet', 'delimiter'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 5.75,
}
