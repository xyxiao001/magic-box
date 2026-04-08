import { describe, expect, it } from 'vitest'
import { buildTimeLabResult, resolveDateInput } from '@/lib/time'

describe('time lab helpers', () => {
  it('parses 10-digit unix timestamp as seconds', () => {
    const date = resolveDateInput('1712534400')

    expect(date?.toISOString()).toBe('2024-04-08T00:00:00.000Z')
  })

  it('builds display fields from date input', () => {
    const result = buildTimeLabResult('2026-04-08T16:00:00Z')

    expect(result?.unixSeconds).toBe('1775664000')
    expect(result?.iso).toBe('2026-04-08T16:00:00.000Z')
  })
})
