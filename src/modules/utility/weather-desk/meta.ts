import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export const weatherDeskMeta: ToolModuleMeta = {
  id: 'weather-desk',
  title: 'Weather Desk',
  category: '天气',
  group: 'utility',
  path: '/tools/weather-desk',
  description: '查询城市天气和未来趋势，并支持当前位置天气。',
  keywords: ['weather', 'forecast', 'city', 'temperature', 'rain'],
  tags: ['network-required', 'favorite-supported', 'history-supported'],
  capabilities: ['favorite', 'recent', 'history', 'draft', 'sample-data', 'share-url'],
  order: 23,
}
