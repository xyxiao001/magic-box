import { describe, expect, it } from 'vitest'
import {
  buildSqlFormatterDownloadPayload,
  buildSqlFormatterHistoryLabel,
  createSqlFormatterInitialInput,
  executeSqlFormatter,
} from './module'

describe('sql formatter module', () => {
  it('formats sql and exposes stats', () => {
    const input = createSqlFormatterInitialInput()
    input.sqlInput = 'select id,name from users where active = 1'

    const output = executeSqlFormatter(input)

    expect(output.formattedText).toContain('SELECT')
    expect(output.inputStats.characters).toBeGreaterThan(0)
    expect(output.outputStats.lines).toBeGreaterThan(1)
    expect(output.hasChanges).toBe(true)
    expect(buildSqlFormatterDownloadPayload(output)?.filename).toBe('sql-formatter-formatted.sql')
  })

  it('builds history label from compact mode', () => {
    const input = createSqlFormatterInitialInput()

    expect(buildSqlFormatterHistoryLabel(input)).toBe('格式化 SQL')

    input.options.compact = true

    expect(buildSqlFormatterHistoryLabel(input)).toBe('压缩 SQL')
  })
})
