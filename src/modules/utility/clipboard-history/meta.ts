import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const clipboardHistoryMeta: ToolModuleMeta = {
  id: 'clipboard-history',
  title: 'Clipboard History',
  category: '剪贴板',
  group: 'utility',
  path: '/tools/clipboard-history',
  description: '保存最近的文本片段，支持搜索、置顶、复制和删除。',
  keywords: ['clipboard', 'history', 'snippet', 'copy', 'paste'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported'],
  capabilities: ['favorite', 'recent', 'draft'],
  order: 16,
}
