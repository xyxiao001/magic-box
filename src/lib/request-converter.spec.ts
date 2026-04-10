import { describe, expect, it } from 'vitest'
import {
  buildAxiosSnippet,
  buildFetchSnippet,
  buildRequestConfigJson,
  parseCurlRequest,
  tokenizeCurl,
} from './request-converter'

describe('request converter', () => {
  it('tokenizes quoted curl', () => {
    expect(tokenizeCurl("curl -H 'a: b' https://example.com")).toEqual([
      'curl',
      '-H',
      'a: b',
      'https://example.com',
    ])
  })

  it('parses basic curl request', () => {
    const parsed = parseCurlRequest(
      "curl -X POST 'https://api.example.com/v1' -H 'Content-Type: application/json' -d '{\"a\":1}'"
    )

    expect(parsed.ok).toBe(true)
    expect(parsed.method).toBe('POST')
    expect(parsed.url).toContain('https://api.example.com/v1')
    expect(parsed.headers.some((h) => h.key === 'Content-Type')).toBe(true)
    expect(parsed.body).toBe('{"a":1}')
  })

  it('generates snippets', () => {
    const parsed = parseCurlRequest("curl 'https://example.com' -H 'X-Test: 1'")
    const fetchCode = buildFetchSnippet(parsed)
    const axiosCode = buildAxiosSnippet(parsed)
    const config = buildRequestConfigJson(parsed)

    expect(fetchCode).toContain('fetch("https://example.com"')
    expect(axiosCode).toContain('axios.request')
    expect(config).toContain('"url": "https://example.com"')
  })
})

