import { describe, expect, it } from 'vitest'
import {
  buildMarkdownStudioHistoryLabel,
  createMarkdownStudioInitialInput,
  executeMarkdownStudio,
  markdownStudioSamples,
} from './module'

describe('markdown studio module', () => {
  it('renders markdown and calculates stats', () => {
    const input = createMarkdownStudioInitialInput()
    const output = executeMarkdownStudio(input)

    expect(output.htmlPreview).toContain('<h1')
    expect(output.stats.chars).toBeGreaterThan(0)
  })

  it('builds history labels and exposes samples', () => {
    const output = executeMarkdownStudio(createMarkdownStudioInitialInput())

    expect(buildMarkdownStudioHistoryLabel(output)).toContain('Markdown')
    expect(markdownStudioSamples).toHaveLength(3)
  })
})
