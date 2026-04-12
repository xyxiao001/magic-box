import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const imageStudioMeta: ToolModuleMeta = {
  id: 'image-studio',
  title: 'Image Studio',
  category: '图片',
  group: 'media',
  path: '/tools/image-studio',
  description: '本地压缩、裁切、缩放图片，并导出常见格式。',
  keywords: ['image', 'compress', 'resize', 'crop', 'webp'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'sample-data', 'share-url'],
  order: 17,
}
