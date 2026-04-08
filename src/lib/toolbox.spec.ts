import { describe, expect, it } from 'vitest'
import { toolModules } from '@/data/tool-modules'
import { getToolCount, orderModulesByFavorite } from '@/lib/toolbox'

describe('toolbox helpers', () => {
  it('moves favorite modules to the front while preserving all items', () => {
    const ordered = orderModulesByFavorite(toolModules, ['codec-lab'], '')

    expect(ordered[0]?.id).toBe('codec-lab')
    expect(ordered).toHaveLength(toolModules.length)
  })

  it('filters modules by search query', () => {
    const ordered = orderModulesByFavorite(toolModules, [], 'json')

    expect(ordered).toHaveLength(1)
    expect(ordered[0]?.id).toBe('json-toolkit')
  })

  it('counts tool modules', () => {
    expect(getToolCount(toolModules)).toBe(3)
  })
})
