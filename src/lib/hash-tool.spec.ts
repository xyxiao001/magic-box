import { describe, expect, it } from 'vitest'
import {
  buildHashRows,
  compareTargetHash,
  hashBytes,
  hashText,
} from './hash-tool'

describe('hash helpers', () => {
  it('hashes bytes with md5', async () => {
    const value = await hashBytes(new TextEncoder().encode('hello'), 'MD5')

    expect(value).toBe('5d41402abc4b2a76b9719d911017c592')
  })

  it('hashes text into multiple algorithms', async () => {
    const rows = await hashText('hello')

    expect(rows).toHaveLength(4)
    expect(rows.find((row) => row.algorithm === 'SHA-256')?.value).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    )
  })

  it('builds row lengths correctly', async () => {
    const rows = await buildHashRows(new TextEncoder().encode('a'))

    expect(rows.find((row) => row.algorithm === 'SHA-512')?.length).toBe(128)
  })

  it('matches target hash', () => {
    const result = compareTargetHash('ABC', [
      { algorithm: 'MD5', value: 'abc', length: 3 },
      { algorithm: 'SHA-1', value: 'def', length: 3 },
    ])

    expect(result.matched).toBe(true)
    expect(result.matchedAlgorithm).toBe('MD5')
  })
})
