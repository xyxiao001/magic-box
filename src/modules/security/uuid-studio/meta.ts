import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const uuidStudioMeta: ToolModuleMeta = {
  id: 'uuid-studio',
  title: 'UUID / NanoID Studio',
  category: '标识',
  group: 'security',
  path: '/tools/uuid-studio',
  description: '生成 UUID v4 和 NanoID，支持批量生成、长度控制与基础校验。',
  keywords: ['uuid', 'nanoid', 'id', 'identifier', 'random', 'token'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output'],
  order: 11.5,
}
