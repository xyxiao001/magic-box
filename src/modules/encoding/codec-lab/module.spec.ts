import { describe, expect, it } from 'vitest'
import {
  buildCodecLabDownloadPayload,
  buildCodecLabHistoryLabel,
  createCodecLabInitialInput,
  executeCodecLab,
  codecLabSamples,
} from './module'

describe('codec lab module', () => {
  it('transforms codec input and builds download payload', () => {
    const input = createCodecLabInitialInput()
    const output = executeCodecLab(input)

    expect(output.result.ok).toBe(true)
    expect(output.result.value).toContain('magic-box.dev')
    expect(buildCodecLabDownloadPayload(output)?.filename).toBe('codec-lab-output.txt')
  })

  it('builds history labels and exposes samples', () => {
    const input = createCodecLabInitialInput()
    const output = executeCodecLab(input)

    expect(buildCodecLabHistoryLabel(input, output)).toContain('URL')
    expect(codecLabSamples).toHaveLength(3)
    expect(codecLabSamples[2]?.apply(input).mode).toBe('base64')
  })
})
