import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const whiteNoiseStudioMeta: ToolModuleMeta = {
  id: 'white-noise-studio',
  title: 'White Noise Studio',
  category: '专注',
  group: 'media',
  path: '/tools/white-noise-studio',
  description: '播放本地生成的环境音，支持叠加、音量和定时停止。',
  keywords: ['noise', 'focus', 'rain', 'ocean', 'sound'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported'],
  capabilities: ['favorite', 'recent', 'draft', 'history'],
  order: 24,
}
