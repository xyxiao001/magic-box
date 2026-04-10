import { describe, expect, it } from 'vitest'
import {
  dedupeHeaders,
  mergeHeaders,
  parseCookieHeader,
  parseHeadersText,
  parseSetCookieText,
  stringifyCookieHeader,
  stringifyHeaders,
} from './header-cookie'

describe('header & cookie helpers', () => {
  it('parses headers', () => {
    const entries = parseHeadersText('A: 1\nB: 2')
    expect(entries).toHaveLength(2)
    expect(stringifyHeaders(entries)).toContain('A: 1')
  })

  it('dedupes headers', () => {
    const entries = parseHeadersText('A: 1\nA: 2')
    const deduped = dedupeHeaders(entries, 'keep-last')
    expect(deduped).toHaveLength(1)
    expect(deduped[0]?.value).toBe('2')
  })

  it('merges headers', () => {
    const left = parseHeadersText('A: 1')
    const right = parseHeadersText('B: 2')
    expect(mergeHeaders(left, right)).toHaveLength(2)
  })

  it('parses cookie header', () => {
    const cookies = parseCookieHeader('a=1; b=2')
    expect(cookies).toHaveLength(2)
    expect(stringifyCookieHeader(cookies)).toBe('a=1; b=2')
  })

  it('parses set-cookie', () => {
    const cookies = parseSetCookieText('Set-Cookie: sid=abc; Path=/; HttpOnly')
    expect(cookies).toHaveLength(1)
    expect(cookies[0]?.attributes.httponly).toBe(true)
  })
})

