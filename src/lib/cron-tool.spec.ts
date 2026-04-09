import { describe, expect, it } from 'vitest'
import {
  buildCronFromBuilder,
  buildCronTemplates,
  getNextRunTimes,
  parseCronExpression,
} from './cron-tool'

describe('cron helpers', () => {
  it('parses a valid cron expression', () => {
    const result = parseCronExpression('30 10 * * 1-5')

    expect(result.ok).toBe(true)
    expect(result.description).toContain('10 点')
  })

  it('rejects invalid cron field count', () => {
    const result = parseCronExpression('* * * *')

    expect(result.ok).toBe(false)
  })

  it('builds cron from builder state', () => {
    expect(
      buildCronFromBuilder({
        mode: 'weekdays',
        minute: 15,
        hour: 9,
        weekday: 2,
      })
    ).toBe('15 9 * * 1-5')
  })

  it('gets upcoming run times', () => {
    const result = getNextRunTimes('0 9 * * *', 2, new Date('2026-04-09T08:10:00'))

    expect(result).toHaveLength(2)
    expect(result[0]).toContain('2026')
  })

  it('provides common templates', () => {
    expect(buildCronTemplates()).toHaveLength(4)
  })
})
