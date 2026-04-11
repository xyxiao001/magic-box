import { describe, expect, it } from 'vitest'
import {
  buildUrlFromInspectorState,
  buildUrlInspectorQueryJson,
  parseUrlInspectorInput,
} from '@/lib/url-inspector'

describe('url inspector helpers', () => {
  it('parses a url into base fields and query entries', () => {
    const result = parseUrlInspectorInput(
      'https://magic-box.dev/tools/http-lab?tab=request&traceId=req-1#response'
    )

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.protocol).toBe('https')
      expect(result.hostname).toBe('magic-box.dev')
      expect(result.pathname).toBe('/tools/http-lab')
      expect(result.hash).toBe('response')
      expect(result.queryEntries).toHaveLength(2)
      expect(result.queryEntries[0]).toMatchObject({
        key: 'tab',
        value: 'request',
      })
    }
  })

  it('detects encoded segments in pathname and query values', () => {
    const result = parseUrlInspectorInput(
      'https://magic-box.dev/callback%2Foauth?redirect_uri=https%3A%2F%2Fapp.dev%2Fdone'
    )

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.hasEncodedSegments).toBe(true)
      expect(result.decodedPathname).toBe('/callback/oauth')
      expect(result.queryEntries[0]?.encodedValue).toBe(true)
    }
  })

  it('rebuilds url from editable state', () => {
    const rebuilt = buildUrlFromInspectorState({
      protocol: 'https',
      hostname: 'magic-box.dev',
      pathname: '/callback',
      hash: 'done',
      queryEntries: [
        { key: 'code', value: 'abc' },
        { key: 'state', value: 'xyz' },
      ],
    })

    expect(rebuilt).toBe('https://magic-box.dev/callback?code=abc&state=xyz#done')
  })

  it('exports query entries as grouped json', () => {
    const queryJson = buildUrlInspectorQueryJson([
      { key: 'scope', value: 'openid' },
      { key: 'scope', value: 'profile' },
      { key: 'state', value: 'xyz' },
    ])

    expect(queryJson).toBe('{\n  "scope": [\n    "openid",\n    "profile"\n  ],\n  "state": "xyz"\n}')
  })
})
