import { describe, expect, it } from 'vitest'
import {
  buildHmacSignerDownloadPayload,
  buildHmacSignerHistoryLabel,
  createHmacSignerInitialInput,
  executeHmacSigner,
  hmacSignerSamples,
} from './module'

describe('hmac signer module', () => {
  it('computes hmac output and builds download payload', async () => {
    const input = createHmacSignerInitialInput()
    const output = await executeHmacSigner(input, { secret: 'secret-123' })

    expect(output.signatureHex).toBeTruthy()
    expect(output.signatureBase64).toBeTruthy()
    expect(buildHmacSignerDownloadPayload(output)?.filename).toBe('hmac-signer-report.txt')
  })

  it('builds history labels and exposes samples', async () => {
    const output = await executeHmacSigner(createHmacSignerInitialInput(), { secret: 'secret-123' })

    expect(buildHmacSignerHistoryLabel(output)).toContain('HMAC')
    expect(hmacSignerSamples).toHaveLength(2)
  })
})
