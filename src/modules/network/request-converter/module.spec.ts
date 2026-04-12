import { describe, expect, it } from 'vitest'
import {
  buildRequestConverterDownloadPayload,
  buildRequestConverterHistoryLabel,
  createRequestConverterInitialInput,
  executeRequestConverter,
  getRequestConverterActiveOutput,
} from './module'

describe('request converter module', () => {
  it('parses curl input and builds snippets', () => {
    const input = createRequestConverterInitialInput()
    input.curlInput = "curl -X POST 'https://api.example.com/v1/test' -H 'Content-Type: application/json' -d '{\"a\":1}'"

    const output = executeRequestConverter(input)

    expect(output.parsed.method).toBe('POST')
    expect(output.fetchSnippet).toContain('fetch("https://api.example.com/v1/test"')
    expect(output.axiosSnippet).toContain('axios.request')
    expect(output.nodeFetchSnippet).toContain('Node 18+')
  })

  it('selects tab output and builds safe history labels', () => {
    const input = createRequestConverterInitialInput()
    const output = executeRequestConverter(input)

    expect(getRequestConverterActiveOutput(output, 'structured')).toContain('"url"')
    expect(getRequestConverterActiveOutput(output, 'fetch')).toContain('fetch(')
    expect(buildRequestConverterHistoryLabel(output)).toContain('GET')
    expect(buildRequestConverterDownloadPayload(output, 'structured')?.filename).toBe('request-converter-config.json')
  })
})
