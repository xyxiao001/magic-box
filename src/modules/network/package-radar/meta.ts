import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const packageRadarMeta: ToolModuleMeta = {
  id: 'package-radar',
  title: 'Package Radar',
  category: '包管理',
  group: 'network',
  path: '/tools/package-radar',
  description: '搜索 npm 包并查看版本、安装命令与官方链接。',
  keywords: ['npm', 'package', 'registry', 'version', 'install'],
  tags: ['network-required', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'sample-data', 'share-url'],
  order: 15,
}
