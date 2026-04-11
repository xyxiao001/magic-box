import { describe, expect, it } from 'vitest'
import {
  buildJsonStructuredDiff,
  executeJsonPathQuery,
  formatJsonPathResultValue,
  parseJsonDocument,
} from '@/lib/json-diff-jsonpath'

describe('json diff / jsonpath', () => {
  it('builds structured diff entries', () => {
    const left = parseJsonDocument('{"name":"Magic Box","meta":{"version":1},"items":[1,2]}').value
    const right = parseJsonDocument('{"name":"Magic Box","meta":{"version":2},"items":[1,3],"beta":true}').value
    const result = buildJsonStructuredDiff(left, right)

    expect(result.stats.changed).toBeGreaterThan(0)
    expect(result.stats.added).toBe(1)
    expect(result.entries.some((entry) => entry.path === '$.meta.version' && entry.kind === 'changed')).toBe(true)
  })

  it('executes jsonpath property and index queries', () => {
    const input = parseJsonDocument('{"data":{"items":[{"id":"tool_1"},{"id":"tool_2"}]}}').value
    const result = executeJsonPathQuery(input, '$.data.items[1].id')

    expect(result.ok).toBe(true)
    expect(result.value).toEqual([{ path: '$.data.items[1].id', value: 'tool_2' }])
  })

  it('supports wildcard queries', () => {
    const input = parseJsonDocument('{"data":{"items":[{"id":"tool_1"},{"id":"tool_2"}]}}').value
    const result = executeJsonPathQuery(input, '$.data.items[*].id')

    expect(result.ok).toBe(true)
    expect(result.value?.map((item) => item.value)).toEqual(['tool_1', 'tool_2'])
  })

  it('formats complex jsonpath values', () => {
    expect(formatJsonPathResultValue({ ok: true })).toContain('\n')
  })
})
