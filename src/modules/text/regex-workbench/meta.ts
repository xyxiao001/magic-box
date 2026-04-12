import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const regexWorkbenchMeta: ToolModuleMeta = {
  id: 'regex-workbench',
  title: 'Regex Workbench',
  category: '正则',
  group: 'text',
  path: '/tools/regex-workbench',
  description: '测试表达式、查看分组并预览替换结果。',
  keywords: ['regex', 'regexp', 'match', 'replace', 'groups'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 9,
}
