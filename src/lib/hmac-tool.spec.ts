import { describe, expect, it } from 'vitest'
import { buildCanonicalString, compareSignature, computeHmacSha256 } from './hmac-tool'

describe('hmac helpers', () => {
  it('computes hmac sha256 in hex', async () => {
    const value = await computeHmacSha256('key', 'The quick brown fox jumps over the lazy dog', 'hex')

    expect(value).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8')
  })

  it('builds canonical string', () => {
    const canonical = buildCanonicalString(
      {
        method: 'get',
        path: '/v1/items',
        query: 'b=2&a=1',
        timestamp: '1',
        nonce: 'n',
        body: '',
      },
      { sortQuery: true, filterEmpty: true, delimiter: 'newline' }
    )

    expect(canonical).toContain('GET')
    expect(canonical).toContain('a=1&b=2')
  })

  it('compares signatures', () => {
    expect(compareSignature('ABC', 'abc').matched).toBe(true)
  })
})

