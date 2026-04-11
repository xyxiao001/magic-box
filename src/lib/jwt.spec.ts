import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildUnsignedJwt,
  parseJwt,
  parseJwtJsonInput,
  signJwtHs256,
  verifyJwtHs256,
} from './jwt'

beforeEach(() => {
  vi.stubGlobal('crypto', crypto)
})

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

  it('signs and verifies hs256 jwt', async () => {
    const signed = await signJwtHs256(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-1', role: 'admin' },
      'magic-box-secret'
    )

    expect(signed.ok).toBe(true)
    expect(signed.token.split('.')).toHaveLength(3)

    const verified = await verifyJwtHs256(signed.token, 'magic-box-secret')
    expect(verified.ok).toBe(true)
    expect(verified.verified).toBe(true)
  })

  it('marks verification failure when secret does not match', async () => {
    const signed = await signJwtHs256(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'user-1' },
      'magic-box-secret'
    )

    const verified = await verifyJwtHs256(signed.token, 'wrong-secret')

    expect(verified.ok).toBe(true)
    expect(verified.verified).toBe(false)
  })

  it('parses json object input for jwt editor', () => {
    const result = parseJwtJsonInput('{"sub":"user-1"}', {})

    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ sub: 'user-1' })
  })
})
