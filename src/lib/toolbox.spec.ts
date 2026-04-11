import { describe, expect, it } from 'vitest'
import { toolModules } from '@/data/tool-modules'
import {
  filterModulesBySearch,
  getToolCount,
  orderModulesByFavorite,
  orderModulesByPreference,
} from '@/lib/toolbox'

describe('toolbox helpers', () => {
  it('moves favorite modules to the front while preserving all items', () => {
    const ordered = orderModulesByFavorite(toolModules, ['codec-lab'])

    expect(ordered[0]?.id).toBe('codec-lab')
    expect(ordered).toHaveLength(toolModules.length)
  })

  it('keeps navigation order stable after favorites', () => {
    const ordered = orderModulesByFavorite(toolModules, ['request-converter', 'codec-lab'])

    expect(ordered.slice(0, 4).map((module) => module.id)).toEqual([
      'codec-lab',
      'request-converter',
      'json-toolkit',
      'qrcode-studio',
    ])
  })

  it('filters modules by search query', () => {
    const ordered = filterModulesBySearch(toolModules, 'json')

    expect(ordered.map((module) => module.id)).toEqual(['json-toolkit', 'json-typegen'])
  })

  it('keeps original order after favorite modules when no manual sorting exists', () => {
    const ordered = orderModulesByPreference(toolModules, ['codec-lab'], '')

    expect(ordered.map((module) => module.id)).toEqual([
      'codec-lab',
      'json-toolkit',
      'qrcode-studio',
      'diff-studio',
      'markdown-studio',
      'text-toolkit',
      'http-lab',
      'request-converter',
      'url-inspector',
      'json-typegen',
      'regex-workbench',
      'jwt-studio',
      'jwt-sign-verify',
      'hash-studio',
      'uuid-studio',
      'header-cookie-lab',
      'websocket-lab',
      'hmac-signer',
      'package-radar',
      'clipboard-history',
      'image-studio',
      'color-studio',
      'time-lab',
      'cron-planner',
      'calculator-pro',
      'unit-converter',
      'weather-desk',
      'white-noise-studio',
    ])
  })

  it('counts tool modules', () => {
    expect(getToolCount(toolModules)).toBe(28)
  })
})
