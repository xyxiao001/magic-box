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

  it('deep converts nested json strings when converting to js object', () => {
    const input = createJsonToolkitInitialInput()
    input.source = JSON.stringify({
      request: '{"headers":{"x-foo":"bar"},"retry":[1,2]}',
      list: ['{"enabled":true}', 'plain'],
    })
    input.action = 'convert-js-object'
    input.deepConvert = true

    const output = executeJsonToolkit(input)

    expect(output.outputType).toBe('js-object')
    expect(output.structuredOutput).toEqual({
      request: {
        headers: {
          'x-foo': 'bar',
        },
        retry: [1, 2],
      },
      list: [{ enabled: true }, 'plain'],
    })
  })
})
