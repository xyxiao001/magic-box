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

  it('filters modules by search query', () => {
    const ordered = filterModulesBySearch(toolModules, 'json')

    expect(ordered).toHaveLength(1)
    expect(ordered[0]?.id).toBe('json-toolkit')
  })

  it('keeps original order after favorite modules when no manual sorting exists', () => {
    const ordered = orderModulesByPreference(toolModules, ['codec-lab'], '')

    expect(ordered.map((module) => module.id)).toEqual([
      'codec-lab',
      'regex-workbench',
      'http-lab',
      'qrcode-studio',
      'package-radar',
      'time-lab',
      'json-toolkit',
      'markdown-studio',
      'jwt-studio',
      'diff-studio',
      'image-studio',
      'color-studio',
      'cron-planner',
      'hash-studio',
      'calculator-pro',
      'unit-converter',
      'clipboard-history',
      'weather-desk',
      'white-noise-studio',
    ])
  })

  it('counts tool modules', () => {
    expect(getToolCount(toolModules)).toBe(19)
  })
})
