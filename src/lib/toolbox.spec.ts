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
    const orderedIds = filterModulesBySearch(toolModules, 'json').map((module) => module.id)

    expect(orderedIds).toEqual(
      expect.arrayContaining(['json-toolkit', 'json-typegen', 'json-diff-jsonpath'])
    )
    expect(orderedIds[0]).toBe('json-toolkit')
    expect(orderedIds.indexOf('json-typegen')).toBeLessThan(orderedIds.indexOf('json-diff-jsonpath'))
  })

  it('keeps original order after favorite modules when no manual sorting exists', () => {
    const favoriteIds = ['codec-lab']
    const orderedIds = orderModulesByPreference(toolModules, favoriteIds, '').map((module) => module.id)
    const remainingOrderedIds = orderedIds.filter((id) => !favoriteIds.includes(id))
    const originalIds = toolModules.map((module) => module.id)
    const remainingOriginalIds = originalIds.filter((id) => !favoriteIds.includes(id))

    expect(orderedIds[0]).toBe('codec-lab')
    expect(remainingOrderedIds).toEqual(remainingOriginalIds)
  })

  it('counts tool modules', () => {
    expect(getToolCount(toolModules)).toBe(toolModules.length)
  })
})
