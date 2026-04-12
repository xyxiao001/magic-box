import { describe, expect, it } from 'vitest'
import {
  buildImageStudioHistoryLabel,
  createImageStudioInitialInput,
  executeImageStudio,
  imageStudioSamples,
  normalizeImageStudioInput,
} from './module'

describe('image studio module', () => {
  it('builds config summary output', () => {
    const output = executeImageStudio(createImageStudioInitialInput())

    expect(output.formatLabel).toBe('WebP')
    expect(output.scaleLabel).toBe('100%')
    expect(output.cropLabel).toBe('原始比例')
    expect(output.rotationLabel).toBe('0°')
    expect(output.backgroundLabel).toBe('透明')
  })

  it('builds history labels and exposes samples', () => {
    const output = executeImageStudio(createImageStudioInitialInput())

    expect(buildImageStudioHistoryLabel(output)).toContain('WebP')
    expect(buildImageStudioHistoryLabel(output)).toContain('原始比例')
    expect(imageStudioSamples).toHaveLength(3)
  })

  it('normalizes legacy input without v1.1 fields', () => {
    const input = normalizeImageStudioInput({
      format: 'image/jpeg',
      quality: 92,
      scale: 80,
      crop: '1:1',
    })

    expect(input.rotation).toBe(0)
    expect(input.background).toBe('transparent')
    expect(input.fillColor).toBe('#ffffff')
    expect(executeImageStudio(input).backgroundLabel).toBe('#FFFFFF')
  })
})
