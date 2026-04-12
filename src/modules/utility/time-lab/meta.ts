import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const timeLabMeta: ToolModuleMeta = {
  id: 'time-lab',
  title: 'Time Lab',
  category: '时间',
  group: 'utility',
  path: '/tools/time-lab',
  description: 'Unix 时间戳与日期字符串互转，支持本地时间和 UTC。',
  keywords: ['timestamp', 'time', 'date', 'utc', 'unix'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 19,
}
