import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const diffStudioMeta: ToolModuleMeta = {
  id: 'diff-studio',
  title: 'Diff Studio',
  category: '对比',
  group: 'text',
  path: '/tools/diff-studio',
  description: '逐行比较两段文本，查看新增、删除和未变化内容。',
  keywords: ['diff', 'compare', 'patch', 'text', 'line'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 4,
}
