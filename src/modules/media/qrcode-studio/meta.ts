import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const qrcodeStudioMeta: ToolModuleMeta = {
  id: 'qrcode-studio',
  title: 'QRCode Studio',
  category: '二维码',
  group: 'media',
  path: '/tools/qrcode-studio',
  description: '本地生成二维码，支持尺寸、配色和 PNG 下载。',
  keywords: ['qrcode', 'qr', 'png', 'download', 'share'],
  tags: ['offline-ready', 'local-processing', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'sample-data', 'share-url'],
  order: 2,
}
