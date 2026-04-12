import { describe, expect, it } from 'vitest'
import {
  buildUrlInspectorHistoryLabel,
  cloneUrlInspectorEntries,
  createUrlInspectorInitialInput,
  executeUrlInspector,
} from './module'

describe('url inspector module', () => {
  it('parses url input and builds derived outputs', () => {
    const input = createUrlInspectorInitialInput()
    input.urlInput = 'https://magic-box.dev/callback?code=abc&state=xyz#done'

    const output = executeUrlInspector(input)

    expect(output.parsed.hostname).toBe('magic-box.dev')
    expect(output.queryJson).toContain('"code": "abc"')
    expect(buildUrlInspectorHistoryLabel(output)).toBe('magic-box.dev/callback')
  })

  it('clones query entries without reusing original references', () => {
    const output = executeUrlInspector({
      urlInput: 'https://magic-box.dev/path?tab=request&trace=1',
    })

    const cloned = cloneUrlInspectorEntries(output.parsed.queryEntries)

    expect(cloned).toEqual(output.parsed.queryEntries)
    expect(cloned[0]).not.toBe(output.parsed.queryEntries[0])
  })
})
