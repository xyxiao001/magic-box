import { describe, expect, it } from 'vitest'
import {
  buildJsonDiffJsonPathDownloadPayload,
  buildJsonDiffJsonPathHistoryLabel,
  createJsonDiffJsonPathInitialInput,
  executeJsonDiffJsonPath,
  jsonDiffJsonPathSamples,
} from './module'

describe('json diff / jsonpath module', () => {
  it('builds structured diff and jsonpath output', () => {
    const input = createJsonDiffJsonPathInitialInput()
    const output = executeJsonDiffJsonPath(input)

    expect(output.canDiff).toBe(true)
    expect(output.structuredDiff?.stats.changed).toBeGreaterThan(0)
    expect(output.jsonPathResult.ok).toBe(true)
    expect(buildJsonDiffJsonPathDownloadPayload(output, 'jsonpath')?.filename).toBe('jsonpath-result.txt')
  })

  it('builds history labels and exposes samples', () => {
    const output = executeJsonDiffJsonPath(createJsonDiffJsonPathInitialInput())

    expect(buildJsonDiffJsonPathHistoryLabel(output)).toContain('JSON 差异')
    expect(jsonDiffJsonPathSamples).toHaveLength(2)
    expect(jsonDiffJsonPathSamples[0]?.apply(createJsonDiffJsonPathInitialInput()).queryExpression).toContain('$')
  })
})
