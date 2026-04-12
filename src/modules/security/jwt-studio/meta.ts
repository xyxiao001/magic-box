import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const jwtStudioMeta: ToolModuleMeta = {
  id: 'jwt-studio',
  title: 'JWT Studio',
  category: '鉴权',
  group: 'security',
  path: '/tools/jwt-studio',
  description: '本地解析 JWT，查看 header、payload 与过期状态。',
  keywords: ['jwt', 'token', 'auth', 'claims', 'bearer'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 10,
}
