import { describe, expect, it } from 'vitest'
import { buildJsonToolkitDownloadPayload, createJsonToolkitInitialInput, executeJsonToolkit } from './module'

describe('json toolkit module', () => {
  it('formats json and returns structured output metadata', () => {
    const input = createJsonToolkitInitialInput()
    input.source = '{"name":"magic","items":[1,2]}'
    input.action = 'format'

    const output = executeJsonToolkit(input)

    expect(output.outputType).toBe('json')
    expect(output.preferredTab).toBe('tree')
    expect(output.text).toContain('\n')
    expect(output.structuredOutput).toEqual({
      name: 'magic',
      items: [1, 2],
    })
  })

  it('throws on invalid json', () => {
    const input = createJsonToolkitInitialInput()
    input.source = '{"name":}'
    input.action = 'validate'

    expect(() => executeJsonToolkit(input)).toThrow()
  })

  it('builds download payloads from output type', () => {
    const input = createJsonToolkitInitialInput()
    input.source = '{"name":"magic"}'
    input.action = 'format'
    const output = executeJsonToolkit(input)

    expect(buildJsonToolkitDownloadPayload(input, output)?.filename).toBe('json-toolkit-format.json')
  })
})
