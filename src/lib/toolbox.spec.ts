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
      'time-lab',
      'json-toolkit',
    ])
  })

  it('counts tool modules', () => {
    expect(getToolCount(toolModules)).toBe(6)
  })
})
