import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const jsonTypegenMeta: ToolModuleMeta = {
  id: 'json-typegen',
  title: 'JSON Typegen',
  category: 'JSON',
  group: 'json',
  path: '/tools/json-typegen',
  description: '把 JSON 转成 TypeScript 类型和 Zod schema 代码。',
  keywords: ['json', 'typescript', 'zod', 'schema', 'typegen'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 8,
}
