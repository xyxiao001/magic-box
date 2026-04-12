import { describe, expect, it } from 'vitest'
import {
  buildTimeLabDownloadPayload,
  buildTimeLabHistoryLabel,
  createTimeLabInitialInput,
  executeTimeLab,
  timeLabSamples,
} from './module'

describe('time lab module', () => {
  it('builds result rows and download payload for valid input', () => {
    const input = createTimeLabInitialInput()
    input.input = '2026-04-08T16:00:00Z'

    const output = executeTimeLab(input)

    expect(output.ok).toBe(true)
    expect(output.result?.unixSeconds).toBe('1775664000')
    expect(buildTimeLabDownloadPayload(output)?.filename).toBe('time-lab-output.txt')
  })

  it('builds history labels and exposes samples', () => {
    const input = createTimeLabInitialInput()
    const output = executeTimeLab(input)

    expect(buildTimeLabHistoryLabel(output)).toContain('时间')
    expect(timeLabSamples).toHaveLength(3)
    expect(timeLabSamples[0]?.apply(input).input).toBe('1712534400')
  })
})
