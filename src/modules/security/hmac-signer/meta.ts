import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const hmacSignerMeta: ToolModuleMeta = {
  id: 'hmac-signer',
  title: 'HMAC Signer',
  category: '鉴权',
  group: 'security',
  path: '/tools/hmac-signer',
  description: '计算 HMAC-SHA256，并可视化 canonical string 与比对结果。',
  keywords: ['hmac', 'sha256', 'signature', 'auth', 'webhook'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 14,
}
