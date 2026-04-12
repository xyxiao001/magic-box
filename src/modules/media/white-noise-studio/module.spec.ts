import { describe, expect, it } from 'vitest'
import {
  buildWhiteNoiseStudioHistoryLabel,
  createWhiteNoiseStudioInitialInput,
  executeWhiteNoiseStudio,
  whiteNoiseStudioSamples,
} from './module'

describe('white noise studio module', () => {
  it('builds active preset summary', () => {
    const input = createWhiteNoiseStudioInitialInput()
    input.activeIds = ['white', 'rain']
    input.timerMinutes = 25

    const output = executeWhiteNoiseStudio(input)

    expect(output.activeCount).toBe(2)
    expect(output.timerLabel).toBe('25:00')
  })

  it('builds history labels and exposes samples', () => {
    const output = executeWhiteNoiseStudio({
      ...createWhiteNoiseStudioInitialInput(),
      activeIds: ['ocean'],
    })

    expect(buildWhiteNoiseStudioHistoryLabel(output)).toContain('1')
    expect(whiteNoiseStudioSamples).toHaveLength(2)
  })
})
