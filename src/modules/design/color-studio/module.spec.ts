import { describe, expect, it } from 'vitest'
import {
  buildColorStudioDownloadPayload,
  buildColorStudioHistoryLabel,
  createColorStudioInitialInput,
  executeColorStudio,
  colorStudioSamples,
} from './module'

describe('color studio module', () => {
  it('parses color input and builds download payload', () => {
    const input = createColorStudioInitialInput()
    const output = executeColorStudio(input)

    expect(output.baseOk).toBe(true)
    expect(output.baseHex).toBe('#3366FF')
    expect(output.schemes.length).toBe(5)
    expect(buildColorStudioDownloadPayload(output)?.filename).toBe('color-studio-output.txt')
  })

  it('builds history labels and exposes samples', () => {
    const output = executeColorStudio(createColorStudioInitialInput())

    expect(buildColorStudioHistoryLabel(output)).toBe('#3366FF')
    expect(colorStudioSamples).toHaveLength(3)
  })
})
