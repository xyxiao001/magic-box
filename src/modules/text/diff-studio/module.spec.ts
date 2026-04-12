import { describe, expect, it } from 'vitest'
import {
  buildDiffStudioDownloadPayload,
  buildDiffStudioHistoryLabel,
  createDiffStudioInitialInput,
  executeDiffStudio,
  diffStudioSamples,
} from './module'

describe('diff studio module', () => {
  it('builds line diff output and download payload', () => {
    const input = createDiffStudioInitialInput()
    const output = executeDiffStudio(input)

    expect(output.diff.rows.length).toBeGreaterThan(0)
    expect(output.diff.identical).toBe(false)
    expect(buildDiffStudioDownloadPayload(output)?.filename).toBe('diff-studio-output.txt')
  })

  it('builds history labels and exposes samples', () => {
    const output = executeDiffStudio(createDiffStudioInitialInput())

    expect(buildDiffStudioHistoryLabel(output)).toContain('差异')
    expect(diffStudioSamples).toHaveLength(3)
  })
})
