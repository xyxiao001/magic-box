import { describe, expect, it } from 'vitest'
import {
  buildHashStudioDownloadPayload,
  buildHashStudioHistoryLabel,
  createHashStudioInitialInput,
  executeHashStudio,
  hashStudioSamples,
} from './module'

describe('hash studio module', () => {
  it('hashes text input and builds download payload', async () => {
    const input = createHashStudioInitialInput()
    input.textInput = 'magic-box'

    const output = await executeHashStudio(input)

    expect(output.sourceType).toBe('text')
    expect(output.rows).toHaveLength(4)
    expect(output.rows[0]?.algorithm).toBe('MD5')
    expect(buildHashStudioDownloadPayload(input, output)?.filename).toBe('hash-studio-text.txt')
  })

  it('builds history labels and sample definitions', () => {
    const input = createHashStudioInitialInput()
    input.textInput = 'request-converter\njson-toolkit'

    expect(buildHashStudioHistoryLabel(input)).toBe('request-converter')
    expect(hashStudioSamples).toHaveLength(3)
    expect(hashStudioSamples[0]?.apply(input).textInput).toContain('magic-box')
  })
})
