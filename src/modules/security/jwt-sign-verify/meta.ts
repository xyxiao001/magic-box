import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const jwtSignVerifyMeta: ToolModuleMeta = {
  id: 'jwt-sign-verify',
  title: 'JWT Sign / Verify',
  category: '鉴权',
  group: 'security',
  path: '/tools/jwt-sign-verify',
  description: '本地签发和验签 HS256 JWT，并联动展示 header、payload 与状态。',
  keywords: ['jwt', 'sign', 'verify', 'token', 'hs256', 'auth'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 10.5,
}
