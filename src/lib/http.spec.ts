import { describe, expect, it } from 'vitest'
import {
  buildHttpRequestConfig,
  formatByteSize,
  formatHttpError,
  formatResponseBody,
  formatResponseHeaders,
  parseHttpHeaders,
} from '@/lib/http'

describe('http helpers', () => {
  it('parses header lines into an object', () => {
    const result = parseHttpHeaders('Accept: application/json\nX-Trace-Id: abc-123')

    expect(result).toEqual({
      ok: true,
      value: {
        Accept: 'application/json',
        'X-Trace-Id': 'abc-123',
      },
    })
  })

  it('returns an error for invalid header lines', () => {
    const result = parseHttpHeaders('Authorization Bearer token')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error).toContain('第 1 行请求头格式无效')
    }
  })

  it('auto adds JSON content type for JSON bodies', () => {
    const result = buildHttpRequestConfig('POST', 'Accept: application/json', '{\n  "ok": true\n}')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.value.headers['Content-Type']).toBe('application/json')
      expect(result.value.init.body).toContain('"ok": true')
    }
  })

  it('formats response headers alphabetically', () => {
    const headers = new Headers({
      'x-powered-by': 'magic-box',
      'content-type': 'application/json',
    })

    expect(formatResponseHeaders(headers)).toBe(
      'content-type: application/json\nx-powered-by: magic-box'
    )
  })

  it('pretty prints JSON responses', () => {
    expect(formatResponseBody('{"name":"Magic Box"}', 'application/json')).toBe(
      '{\n  "name": "Magic Box"\n}'
    )
  })

  it('formats byte sizes and errors for display', () => {
    expect(formatByteSize(980)).toBe('980 B')
    expect(formatByteSize(2048)).toBe('2.0 KB')
    expect(formatHttpError(new Error('Failed to fetch'))).toContain('CORS')
  })
})
