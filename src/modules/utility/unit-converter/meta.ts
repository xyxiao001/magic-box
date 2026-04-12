import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const unitConverterMeta: ToolModuleMeta = {
  id: 'unit-converter',
  title: 'Unit Converter',
  category: '换算',
  group: 'utility',
  path: '/tools/unit-converter',
  description: '转换长度、重量、温度、存储和速度等常见单位。',
  keywords: ['unit', 'convert', 'length', 'temperature', 'storage'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 22,
}
