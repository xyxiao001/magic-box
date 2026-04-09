import { describe, expect, it } from 'vitest'
import { getMarkdownStats, renderMarkdown } from './markdown'

describe('markdown utils', () => {
  it('renders headings and paragraphs', () => {
    const html = renderMarkdown('# T\n\nHello')
    expect(html).toContain('<h1>T</h1>')
    expect(html).toContain('<p>Hello</p>')
  })

  it('renders links safely', () => {
    const html = renderMarkdown('[x](https://example.com)')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('<a')
  })

  it('escapes scripts', () => {
    const html = renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
  })

  it('renders code blocks and inline code', () => {
    const html = renderMarkdown('`a` \n\n```js\nconsole.log(1)\n```')
    expect(html).toContain('<code>a</code>')
    expect(html).toContain('<pre')
    expect(html).toContain('language-javascript')
  })

  it('renders lists and blockquotes', () => {
    const html = renderMarkdown('> tip\n\n- a\n- b\n\n1. x\n2. y')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<ol>')
  })

  it('renders nested lists and task lists', () => {
    const html = renderMarkdown('- parent\n  - child\n- [x] done\n- [ ] todo')
    expect(html).toContain('<li>parent<ul><li>child</li></ul></li>')
    expect(html).toContain('md-task-list-item')
    expect(html).toContain('checked')
    expect(html).toContain('type="checkbox"')
  })

  it('renders images and strikethrough', () => {
    const html = renderMarkdown('![logo](https://example.com/logo.png)\n\n~~deprecated~~')
    expect(html).toContain('class="md-image"')
    expect(html).toContain('src="https://example.com/logo.png"')
    expect(html).toContain('<del>deprecated</del>')
  })

  it('renders nested block content inside list items', () => {
    const html = renderMarkdown('- item\n  > note inside\n  > second line')
    expect(html).toContain('<li>item<blockquote>')
    expect(html).toContain('note inside')
  })

  it('renders tables', () => {
    const html = renderMarkdown('| A | B |\n| :--- | ---: |\n| 1 | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<th style="text-align: left">A</th>')
    expect(html).toContain('<td style="text-align: right">2</td>')
    expect(html).toContain('text-align: left')
    expect(html).toContain('text-align: right')
  })

  it('counts stats', () => {
    const stats = getMarkdownStats('a\n\nb\n\n```js\nx\n```')
    expect(stats.paragraphs).toBe(2)
    expect(stats.codeBlocks).toBe(1)
    expect(stats.chars).toBeGreaterThan(0)
  })
})
