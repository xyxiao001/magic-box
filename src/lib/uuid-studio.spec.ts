import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateIdBatch,
  generateNanoId,
  generateUuidV4,
  nanoAlphabetPresets,
  validateNanoId,
  validateUuidV4,
} from '@/lib/uuid-studio'

beforeEach(() => {
  vi.stubGlobal('crypto', crypto)
})

describe('uuid studio helpers', () => {
  it('generates a valid uuid v4', () => {
    expect(validateUuidV4(generateUuidV4())).toBe(true)
  })

  it('generates nanoid with requested alphabet and length', () => {
    const id = generateNanoId(12, nanoAlphabetPresets.hex)

    expect(id).toHaveLength(12)
    expect(validateNanoId(id, nanoAlphabetPresets.hex)).toBe(true)
  })

  it('generates batch results', () => {
    const results = generateIdBatch('nanoid', 3, 8, nanoAlphabetPresets.numbers)

    expect(results).toHaveLength(3)
    expect(results.every((item) => item.length === 8)).toBe(true)
  })

  it('validates uuid and nanoid input', () => {
    expect(validateUuidV4('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(validateUuidV4('invalid-id')).toBe(false)
    expect(validateNanoId('abc123', nanoAlphabetPresets.lowercase)).toBe(true)
    expect(validateNanoId('ABC123', nanoAlphabetPresets.lowercase)).toBe(false)
  })
})
