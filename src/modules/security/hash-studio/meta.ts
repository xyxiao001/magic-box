import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const hashStudioMeta: ToolModuleMeta = {
  id: 'hash-studio',
  title: 'Hash Studio',
  category: '校验',
  group: 'security',
  path: '/tools/hash-studio',
  description: '计算文本或文件的 MD5、SHA-1、SHA-256、SHA-512，并快速比对。',
  keywords: ['hash', 'md5', 'sha256', 'checksum', 'file'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 11,
}
