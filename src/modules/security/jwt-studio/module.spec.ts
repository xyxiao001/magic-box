import { describe, expect, it } from 'vitest'
import {
  buildJwtStudioDownloadPayload,
  buildJwtStudioHistoryLabel,
  createJwtStudioInitialInput,
  executeJwtStudio,
  jwtStudioSamples,
} from './module'

describe('jwt studio module', () => {
  it('parses jwt input and builds download payload', () => {
    const input = createJwtStudioInitialInput()
    const output = executeJwtStudio(input)

    expect(output.parsed.ok).toBe(true)
    expect(output.parsed.status).toBe('active')
    expect(buildJwtStudioDownloadPayload(output)?.filename).toBe('jwt-studio-report.txt')
  })

  it('builds history labels and exposes samples', () => {
    const output = executeJwtStudio(createJwtStudioInitialInput())

    expect(buildJwtStudioHistoryLabel(output)).toContain('JWT')
    expect(jwtStudioSamples).toHaveLength(3)
    expect(jwtStudioSamples[0]?.apply({ tokenInput: '' }).tokenInput.split('.')).toHaveLength(3)
  })
})
