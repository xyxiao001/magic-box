import { describe, expect, it } from 'vitest'
import {
  buildHeaderCookieLabDownloadPayload,
  buildHeaderCookieLabHistoryLabel,
  createHeaderCookieLabInitialInput,
  executeHeaderCookieLab,
  headerCookieLabSamples,
} from './module'

describe('header & cookie lab module', () => {
  it('parses header mode output and builds text download', () => {
    const input = createHeaderCookieLabInitialInput()
    input.primaryText = 'A: 1\nA: 2'

    const output = executeHeaderCookieLab(input)

    expect(output.mergedHeaders).toHaveLength(2)
    expect(output.dedupedHeaders).toHaveLength(1)
    expect(buildHeaderCookieLabDownloadPayload(input, output)?.filename).toBe('header-cookie-lab-headers.txt')
  })

  it('builds history labels and exposes samples', () => {
    const input = createHeaderCookieLabInitialInput()
    const output = executeHeaderCookieLab(input)

    expect(buildHeaderCookieLabHistoryLabel(input, output)).toContain('Headers')
    expect(headerCookieLabSamples).toHaveLength(3)
    expect(headerCookieLabSamples[1]?.apply(input).mode).toBe('cookie')
  })
})
