import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const headerCookieLabMeta: ToolModuleMeta = {
  id: 'header-cookie-lab',
  title: 'Header & Cookie Lab',
  category: '接口',
  group: 'network',
  path: '/tools/header-cookie-lab',
  description: '解析 Header/Cookie/Set-Cookie，并支持合并、去重与导出。',
  keywords: ['header', 'cookie', 'set-cookie', 'auth', 'cors'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 12,
}
