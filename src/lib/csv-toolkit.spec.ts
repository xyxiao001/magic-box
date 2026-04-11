import { describe, expect, it } from 'vitest'
import {
  convertCsvToJson,
  convertJsonArrayToCsv,
  defaultCsvToolkitOptions,
  parseCsvInput,
} from '@/lib/csv-toolkit'

describe('csv toolkit', () => {
  it('parses csv with headers', () => {
    const result = parseCsvInput('name,age\nAlice,20\nBob,21', defaultCsvToolkitOptions)

    expect(result.ok).toBe(true)
    expect(result.value?.headers).toEqual(['name', 'age'])
    expect(result.value?.records[0]).toEqual({ name: 'Alice', age: '20' })
  })

  it('supports quoted delimiters', () => {
    const result = parseCsvInput('name,comment\nAlice,"Hello, Magic Box"', defaultCsvToolkitOptions)

    expect(result.ok).toBe(true)
    expect(result.value?.records[0]?.comment).toBe('Hello, Magic Box')
  })

  it('converts csv to json', () => {
    const result = convertCsvToJson('name,age\nAlice,20', defaultCsvToolkitOptions)

    expect(result.ok).toBe(true)
    expect(result.value).toContain('"name": "Alice"')
  })

  it('converts json array to csv', () => {
    const result = convertJsonArrayToCsv('[{"name":"Alice","age":20}]', ',')

    expect(result.ok).toBe(true)
    expect(result.value).toBe('name,age\nAlice,20')
  })
})
