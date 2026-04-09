import { describe, expect, it } from 'vitest'
import {
  buildDiscountResult,
  buildSplitResult,
  buildTaxResult,
  evaluateExpression,
} from './calculator-tool'

describe('calculator helpers', () => {
  it('evaluates basic expressions', () => {
    expect(evaluateExpression('1 + 2 * 3')).toBe('7')
    expect(evaluateExpression('(10 - 2) / 4')).toBe('2')
  })

  it('supports percentage shorthand', () => {
    expect(evaluateExpression('200 * 15%')).toBe('30')
  })

  it('builds discount results', () => {
    expect(buildDiscountResult(100, 20)[1]?.value).toBe('80')
  })

  it('builds tax results', () => {
    expect(buildTaxResult(100, 6)[2]?.value).toBe('106')
  })

  it('builds split results', () => {
    expect(buildSplitResult(90, 3)[2]?.value).toBe('30')
  })
})
