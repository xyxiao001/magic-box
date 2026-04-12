import { describe, expect, it } from 'vitest'
import {
  buildHighlightSegments,
  buildRegexWorkbenchDownloadPayload,
  buildRegexWorkbenchHistoryLabel,
  createRegexWorkbenchInitialInput,
  executeRegexWorkbench,
  regexWorkbenchSamples,
} from './module'

describe('regex workbench module', () => {
  it('analyzes regex and builds download payload', () => {
    const input = createRegexWorkbenchInitialInput()
    const output = executeRegexWorkbench(input)

    expect(output.analysis.ok).toBe(true)
    expect(output.analysis.matchCount).toBe(3)
    expect(buildRegexWorkbenchDownloadPayload(output)?.filename).toBe('regex-workbench-report.txt')
  })

  it('builds history labels, segments and exposes samples', () => {
    const output = executeRegexWorkbench(createRegexWorkbenchInitialInput())
    const segments = buildHighlightSegments('foo-bar', [
      { index: 0, value: 'foo', groups: [], namedGroups: {} },
    ])

    expect(buildRegexWorkbenchHistoryLabel(output)).toContain('Regex')
    expect(segments[0]?.kind).toBe('match')
    expect(regexWorkbenchSamples).toHaveLength(5)
  })
})
