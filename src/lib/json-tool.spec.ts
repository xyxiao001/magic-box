import { describe, expect, it } from 'vitest'
import { formatJson, minifyJson, validateJson } from '@/lib/json-tool'

describe('json tool helpers', () => {
  it('formats valid json', () => {
    const result = formatJson('{"name":"magic"}')

    expect(result.ok).toBe(true)
    expect(result.value).toContain('\n')
  })

  it('minifies valid json', () => {
    const result = minifyJson('{"name":"magic","items":[1,2]}')

    expect(result).toEqual({
      ok: true,
      value: '{"name":"magic","items":[1,2]}',
    })
  })

  it('returns clear error for invalid json', () => {
    const result = validateJson('{"name":}')

    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
