import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const cronPlannerMeta: ToolModuleMeta = {
  id: 'cron-planner',
  title: 'Cron Planner',
  category: '调度',
  group: 'utility',
  path: '/tools/cron-planner',
  description: '解释 5 段 cron 表达式，并预览未来触发时间。',
  keywords: ['cron', 'schedule', 'timer', 'job', 'planner'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 20,
}
