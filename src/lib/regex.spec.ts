import { describe, expect, it } from 'vitest'
import { analyzeRegex } from '@/lib/regex'

describe('regex helpers', () => {
  it('lists matches and capture groups', () => {
    const result = analyzeRegex('(foo)-(bar)', 'g', 'foo-bar foo-bar', '$2-$1')

    expect(result.ok).toBe(true)
    expect(result.matchCount).toBe(2)
    expect(result.matches?.[0]?.groups).toEqual([
      { index: 1, value: 'foo' },
      { index: 2, value: 'bar' },
    ])
    expect(result.replacementPreview).toBe('bar-foo bar-foo')
  })

  it('returns readable error for invalid regex', () => {
    const result = analyzeRegex('([a-', '', 'foo', '')

    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
