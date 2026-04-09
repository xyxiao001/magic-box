import { describe, expect, it } from 'vitest'
import { buildNoisePresets, formatTimerLabel } from './noise-tool'

describe('noise helpers', () => {
  it('provides presets', () => {
    expect(buildNoisePresets()).toHaveLength(4)
  })

  it('formats timer label', () => {
    expect(formatTimerLabel(125)).toBe('02:05')
  })
})
