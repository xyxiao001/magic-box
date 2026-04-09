import { describe, expect, it } from 'vitest'
import { buildUnsignedJwt, parseJwt } from './jwt'

describe('jwt helpers', () => {
  it('parses a valid jwt', () => {
    const token = buildUnsignedJwt(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-1', exp: 2_000_000_000 }
    )
    const result = parseJwt(token, 1_900_000_000_000)

    expect(result.ok).toBe(true)
    expect(result.status).toBe('active')
    expect(result.payloadText).toContain('"sub": "user-1"')
  })

  it('detects expired jwt', () => {
    const token = buildUnsignedJwt(
      { alg: 'HS256', typ: 'JWT' },
      { exp: 1_700_000_000 }
    )
    const result = parseJwt(token, 1_800_000_000_000)

    expect(result.status).toBe('expired')
  })

  it('detects not yet valid jwt', () => {
    const token = buildUnsignedJwt(
      { alg: 'HS256', typ: 'JWT' },
      { nbf: 2_000_000_000 }
    )
    const result = parseJwt(token, 1_900_000_000_000)

    expect(result.status).toBe('not-yet-valid')
  })

  it('returns invalid for malformed token', () => {
    const result = parseJwt('abc.def')

    expect(result.ok).toBe(false)
    expect(result.status).toBe('invalid')
  })
})
