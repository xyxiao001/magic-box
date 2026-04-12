import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const jsonDiffJsonPathMeta: ToolModuleMeta = {
  id: 'json-diff-jsonpath',
  title: 'JSON Diff / JSONPath',
  category: 'JSON',
  group: 'json',
  path: '/tools/json-diff-jsonpath',
  description: '对比两段 JSON 的结构差异，并用 JSONPath 快速提取目标字段。',
  keywords: ['json', 'diff', 'jsonpath', 'compare', 'path', 'query'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 8.25,
}
