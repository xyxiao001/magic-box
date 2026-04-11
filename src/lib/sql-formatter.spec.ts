import { describe, expect, it } from 'vitest'
import { buildSqlStats, formatSql } from '@/lib/sql-formatter'

describe('sql formatter', () => {
  it('formats select queries into multiple lines', () => {
    const result = formatSql('select id,name from users where active = 1 and role = \'admin\'', {
      keywordCase: 'upper',
      indentSize: 2,
      compact: false,
    })

    expect(result.ok).toBe(true)
    expect(result.value).toContain('SELECT')
    expect(result.value).toContain('\nFROM')
    expect(result.value).toContain('\nWHERE')
  })

  it('compacts sql into one line', () => {
    const result = formatSql(
      `SELECT id,
name
FROM users`,
      {
        keywordCase: 'lower',
        indentSize: 2,
        compact: true,
      }
    )

    expect(result.ok).toBe(true)
    expect(result.value).toBe('select id, name from users')
  })

  it('builds sql stats', () => {
    expect(buildSqlStats('SELECT 1')).toEqual({
      characters: 8,
      lines: 1,
    })
  })
})
