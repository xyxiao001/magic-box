import { describe, expect, it } from 'vitest'
import {
  buildOutputFileName,
  calculateImageTransform,
  formatImageMeta,
  getCropAspectRatio,
} from './image-tool'

describe('image helpers', () => {
  it('returns null for original crop preset', () => {
    expect(getCropAspectRatio('original')).toBeNull()
  })

  it('calculates centered crop for wide images', () => {
    const result = calculateImageTransform(1600, 900, 100, '1:1')

    expect(result.crop.sw).toBe(900)
    expect(result.crop.sx).toBe(350)
    expect(result.outputWidth).toBe(900)
    expect(result.outputHeight).toBe(900)
  })

  it('calculates centered crop for tall images', () => {
    const result = calculateImageTransform(900, 1600, 50, '16:9')

    expect(result.crop.sh).toBe(506)
    expect(result.outputWidth).toBe(450)
    expect(result.outputHeight).toBe(253)
  })

  it('builds output filenames by format', () => {
    expect(buildOutputFileName('hero.png', 'image/jpeg')).toBe('hero.jpg')
    expect(buildOutputFileName('hero.png', 'image/webp')).toBe('hero.webp')
  })

  it('formats image metadata', () => {
    expect(formatImageMeta(1200, 630, 2048, 'image/png')).toEqual({
      width: 1200,
      height: 630,
      type: 'image/png',
      size: '2.0 KB',
    })
  })
})
