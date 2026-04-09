import { describe, expect, it } from 'vitest'
import { buildLineDiff } from './diff'

describe('diff helpers', () => {
  it('handles empty input', () => {
    const result = buildLineDiff('', '')

    expect(result.identical).toBe(true)
    expect(result.rows).toEqual([])
    expect(result.stats).toEqual({ added: 0, removed: 0, unchanged: 0 })
  })

  it('marks identical lines', () => {
    const result = buildLineDiff('a\nb', 'a\nb')

    expect(result.identical).toBe(true)
    expect(result.stats.unchanged).toBe(2)
  })

  it('marks added and removed lines', () => {
    const result = buildLineDiff('a\nb', 'a\nc')

    expect(result.identical).toBe(false)
    expect(result.stats.removed).toBe(1)
    expect(result.stats.added).toBe(1)
    expect(result.rows.some((row) => row.type === 'remove')).toBe(true)
    expect(result.rows.some((row) => row.type === 'add')).toBe(true)
  })
})
