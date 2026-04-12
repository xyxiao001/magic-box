import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const colorStudioMeta: ToolModuleMeta = {
  id: 'color-studio',
  title: 'Color Studio',
  category: '颜色',
  group: 'design',
  path: '/tools/color-studio',
  description: '转换颜色格式、生成配色方案、预览渐变并检查对比度。',
  keywords: ['color', 'hex', 'rgb', 'hsl', 'gradient'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'copy-output', 'download-output', 'sample-data', 'share-url'],
  order: 18,
}
