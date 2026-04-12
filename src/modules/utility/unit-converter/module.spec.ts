import { describe, expect, it } from 'vitest'
import {
  buildUnitConverterDownloadPayload,
  buildUnitConverterHistoryLabel,
  createUnitConverterInitialInput,
  executeUnitConverter,
  unitConverterSamples,
} from './module'

describe('unit converter module', () => {
  it('converts unit input and builds download payload', () => {
    const input = createUnitConverterInitialInput()
    const output = executeUnitConverter(input)

    expect(output.categoryLabel).toBe('长度')
    expect(output.convertedResults.length).toBeGreaterThan(0)
    expect(buildUnitConverterDownloadPayload(output)?.filename).toBe('unit-converter-output.txt')
  })

  it('builds history labels and exposes samples', () => {
    const input = createUnitConverterInitialInput()
    const output = executeUnitConverter(input)

    expect(buildUnitConverterHistoryLabel(input, output)).toContain('长度')
    expect(unitConverterSamples).toHaveLength(3)
  })
})
