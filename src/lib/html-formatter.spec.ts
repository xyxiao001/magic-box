import { describe, expect, it } from 'vitest'
import { buildHtmlStats, formatHtml, hasHtmlDoctype } from './html-formatter'

describe('html formatter', () => {
  it('formats html fragments with indentation', async () => {
    const result = await formatHtml('<section><h1>Hello</h1><p>World</p></section>', {
      indentSize: 2,
      compact: false,
      addDoctype: false,
    })

    expect(result.ok).toBe(true)
    expect(result.value).toContain('<section>')
    expect(result.value).toContain('\n  <h1>Hello</h1>')
    expect(buildHtmlStats(result.value ?? '').lines).toBeGreaterThan(1)
  })

  it('adds doctype for html documents when enabled', async () => {
    const result = await formatHtml('<html><body><main>Hi</main></body></html>', {
      indentSize: 2,
      compact: false,
      addDoctype: true,
    })

    expect(result.ok).toBe(true)
    expect(hasHtmlDoctype(result.value ?? '')).toBe(true)
    expect(result.value).toContain('<html>')
  })

  it('keeps fragment inputs without doctype even when enabled', async () => {
    const result = await formatHtml('<div><span>Snippet</span></div>', {
      indentSize: 2,
      compact: false,
      addDoctype: true,
    })

    expect(result.ok).toBe(true)
    expect(hasHtmlDoctype(result.value ?? '')).toBe(false)
  })

  it('compacts formatted html output', async () => {
    const result = await formatHtml('<div>\n  <span>A</span>\n  <span>B</span>\n</div>', {
      indentSize: 2,
      compact: true,
      addDoctype: false,
    })

    expect(result.ok).toBe(true)
    expect(result.value).toBe('<div><span>A</span><span>B</span></div>')
    expect(buildHtmlStats(result.value ?? '').lines).toBe(1)
  })

  it('returns a helpful error for empty input', async () => {
    const result = await formatHtml('   ', {
      indentSize: 2,
      compact: false,
      addDoctype: false,
    })

    expect(result).toEqual({
      ok: false,
      error: '请输入 HTML',
    })
  })
})
