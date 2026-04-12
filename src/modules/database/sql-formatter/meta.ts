import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const sqlFormatterMeta: ToolModuleMeta = {
  id: 'sql-formatter',
  title: 'SQL Formatter',
  category: '数据库',
  group: 'database',
  path: '/tools/sql-formatter',
  description: '格式化或压缩 SQL，统一关键字风格并提升可读性。',
  keywords: ['sql', 'query', 'format', 'database', 'select', 'insert'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 5.8,
}
