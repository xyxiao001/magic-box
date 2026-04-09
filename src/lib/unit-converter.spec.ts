import { describe, expect, it } from 'vitest'
import { buildConvertedResults, convertUnit, unitCategories } from './unit-converter'

describe('unit converter helpers', () => {
  it('converts length', () => {
    expect(convertUnit('length', 1, 'km', 'm')).toBe(1000)
  })

  it('converts temperature', () => {
    expect(convertUnit('temperature', 32, 'f', 'c')).toBe(0)
  })

  it('builds all target results', () => {
    const results = buildConvertedResults('storage', 1, 'gb')

    expect(results.find((entry) => entry.unit === 'mb')?.value).toBe('1024')
  })

  it('exposes categories', () => {
    expect(unitCategories.speed.label).toBe('速度')
  })
})
