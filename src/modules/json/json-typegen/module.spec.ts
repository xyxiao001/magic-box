import { describe, expect, it } from 'vitest'
import {
  buildJsonTypegenDownloadPayload,
  buildJsonTypegenHistoryLabel,
  createJsonTypegenInitialInput,
  executeJsonTypegen,
  jsonTypegenSamples,
} from './module'

describe('json typegen module', () => {
  it('generates typescript and zod output', () => {
    const input = createJsonTypegenInitialInput()
    input.jsonInput = '{"id":1,"name":"Magic Box"}'

    const output = executeJsonTypegen(input)

    expect(output.typescriptOutput).toContain('export interface Root')
    expect(output.zodOutput).toContain("import { z } from 'zod'")
    expect(buildJsonTypegenDownloadPayload(input, output, 'typescript')?.filename).toBe('Root.types.ts')
  })

  it('builds history label and exposes samples', () => {
    const input = createJsonTypegenInitialInput()
    input.config.rootName = 'UserProfile'

    expect(buildJsonTypegenHistoryLabel(input)).toBe('JSON -> UserProfile')
    expect(jsonTypegenSamples).toHaveLength(3)
    expect(jsonTypegenSamples[0]?.apply(input).jsonInput).toContain('"id"')
  })
})
