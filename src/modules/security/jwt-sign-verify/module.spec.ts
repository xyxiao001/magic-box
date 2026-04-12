import { describe, expect, it } from 'vitest'
import {
  buildJwtSignVerifyDownloadPayload,
  buildJwtSignVerifyHistoryLabel,
  createJwtSignVerifyInitialInput,
  executeJwtSignVerify,
  jwtSignVerifySamples,
} from './module'

describe('jwt sign / verify module', () => {
  it('signs jwt payload and builds download payload', async () => {
    const input = createJwtSignVerifyInitialInput()
    const output = await executeJwtSignVerify(input, { secret: 'secret-123' })

    expect(output.mode).toBe('sign')
    expect(output.signResult?.token.split('.')).toHaveLength(3)
    expect(buildJwtSignVerifyDownloadPayload(output)?.filename).toBe('jwt-sign-verify-token.txt')
  })

  it('builds history labels and exposes samples', async () => {
    const output = await executeJwtSignVerify(createJwtSignVerifyInitialInput(), { secret: 'secret-123' })

    expect(buildJwtSignVerifyHistoryLabel(output)).toContain('JWT')
    expect(jwtSignVerifySamples).toHaveLength(2)
  })
})
