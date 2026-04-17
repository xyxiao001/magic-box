import { describe, expect, it } from 'vitest'
import {
  buildHtmlFormatterDownloadPayload,
  buildHtmlFormatterHistoryLabel,
  createHtmlFormatterInitialInput,
  executeHtmlFormatter,
  htmlFormatterSamples,
} from './module'

describe('html formatter module', () => {
  it('formats html and exposes stats', async () => {
    const input = createHtmlFormatterInitialInput()
    input.htmlInput = '<div><h1>Hello</h1><p>World</p></div>'

    const output = await executeHtmlFormatter(input)

    expect(output.formattedText).toContain('<div>')
    expect(output.inputStats.characters).toBeGreaterThan(0)
    expect(output.outputStats.lines).toBeGreaterThan(1)
    expect(output.hasChanges).toBe(true)
    expect(buildHtmlFormatterDownloadPayload(output)?.filename).toBe('html-formatter-formatted.html')
  })

  it('builds history labels and exposes samples', () => {
    const input = createHtmlFormatterInitialInput()

    expect(buildHtmlFormatterHistoryLabel(input)).toBe('格式化 HTML')

    input.options.compact = true

    expect(buildHtmlFormatterHistoryLabel(input)).toBe('压缩 HTML')
    expect(htmlFormatterSamples).toHaveLength(2)
  })
})
