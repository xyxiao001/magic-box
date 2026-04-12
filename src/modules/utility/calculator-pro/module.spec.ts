import { describe, expect, it } from 'vitest'
import {
  buildCalculatorProDownloadPayload,
  buildCalculatorProHistoryLabel,
  createCalculatorProInitialInput,
  executeCalculatorPro,
  calculatorProSamples,
} from './module'

describe('calculator pro module', () => {
  it('evaluates expression and builds quick results', () => {
    const input = createCalculatorProInitialInput()
    const output = executeCalculatorPro(input)

    expect(output.expressionResult).toBeTruthy()
    expect(output.discountResults.length).toBeGreaterThan(0)
    expect(buildCalculatorProDownloadPayload(output)?.filename).toBe('calculator-pro-output.txt')
  })

  it('builds history labels and exposes samples', () => {
    const output = executeCalculatorPro(createCalculatorProInitialInput())

    expect(buildCalculatorProHistoryLabel(output)).toContain('结果')
    expect(calculatorProSamples).toHaveLength(3)
  })
})
