import { describe, expect, it } from 'vitest'
import {
  buildColorSchemes,
  buildLinearGradientCss,
  formatHsl,
  formatRgb,
  getContrastLevel,
  getContrastRatio,
  hslToRgb,
  parseColorInput,
  rgbToHex,
  rgbToHsl,
} from './color-tool'

describe('color helpers', () => {
  it('parses hex input', () => {
    const result = parseColorInput('#3366FF')

    expect(result.ok).toBe(true)
    expect(result.hex).toBe('#3366FF')
    expect(result.rgb).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('parses rgb input', () => {
    const result = parseColorInput('rgb(51, 102, 255)')

    expect(result.ok).toBe(true)
    expect(result.hex).toBe('#3366FF')
  })

  it('parses modern hsl input', () => {
    const result = parseColorInput('hsl(225 100% 60%)')

    expect(result.ok).toBe(true)
    expect(result.hex).toBe('#3366FF')
  })

  it('converts between rgb and hsl', () => {
    const hsl = rgbToHsl({ r: 51, g: 102, b: 255 })
    const rgb = hslToRgb(hsl)

    expect(formatRgb(rgb)).toBe('rgb(51, 102, 255)')
    expect(formatHsl(hsl)).toContain('hsl(')
    expect(rgbToHex(rgb)).toBe('#3366FF')
  })

  it('builds color schemes', () => {
    const schemes = buildColorSchemes('#3366FF')

    expect(schemes).toHaveLength(5)
    expect(schemes[0]?.label).toBe('原色')
  })

  it('calculates contrast ratio and level', () => {
    const ratio = getContrastRatio('#111827', '#FFFFFF')

    expect(ratio).toBeGreaterThan(7)
    expect(getContrastLevel(ratio)).toBe('AAA')
  })

  it('builds linear gradient css', () => {
    expect(buildLinearGradientCss('#3366FF', '#FF7A59', 135)).toBe(
      'linear-gradient(135deg, #3366FF, #FF7A59)'
    )
  })
})
