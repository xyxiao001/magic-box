import { describe, expect, it } from 'vitest'
import { toolDefinitions } from '@/tools/registry'
import { scoreToolDefinition, searchToolDefinitions } from '@/tools/registry/search'

describe('tool search ranking', () => {
  it('supports alias expansion for timestamp searches', () => {
    const results = searchToolDefinitions(toolDefinitions, 'unix')

    expect(results[0]?.id).toBe('time-lab')
  })

  it('surfaces url inspector for query and callback searches', () => {
    expect(searchToolDefinitions(toolDefinitions, 'query')[0]?.id).toBe('url-inspector')
    expect(searchToolDefinitions(toolDefinitions, 'callback')[0]?.id).toBe('url-inspector')
  })

  it('surfaces text toolkit for text cleanup searches', () => {
    expect(searchToolDefinitions(toolDefinitions, 'text')[0]?.id).toBe('text-toolkit')
    expect(searchToolDefinitions(toolDefinitions, 'dedupe')[0]?.id).toBe('text-toolkit')
  })

  it('surfaces jwt sign verify for sign and verify searches', () => {
    expect(searchToolDefinitions(toolDefinitions, 'sign')[0]?.id).toBe('jwt-sign-verify')
    expect(searchToolDefinitions(toolDefinitions, 'verify')[0]?.id).toBe('jwt-sign-verify')
  })

  it('surfaces uuid studio for uuid and nanoid searches', () => {
    expect(searchToolDefinitions(toolDefinitions, 'uuid')[0]?.id).toBe('uuid-studio')
    expect(searchToolDefinitions(toolDefinitions, 'nanoid')[0]?.id).toBe('uuid-studio')
  })

  it('surfaces new json diff and csv/sql tools for direct queries', () => {
    expect(searchToolDefinitions(toolDefinitions, 'jsonpath')[0]?.id).toBe('json-diff-jsonpath')
    expect(searchToolDefinitions(toolDefinitions, 'csv')[0]?.id).toBe('csv-toolkit')
    expect(searchToolDefinitions(toolDefinitions, 'sql')[0]?.id).toBe('sql-formatter')
  })

  it('prefers favorites and recent usage in empty search ordering', () => {
    const results = searchToolDefinitions(toolDefinitions, '', {
      favoriteToolIds: ['request-converter'],
      recentTools: [{ id: 'json-toolkit', count: 4 }],
    })

    expect(results.slice(0, 2).map((tool) => tool.id)).toEqual(['request-converter', 'json-toolkit'])
  })

  it('adds favorite and recent weights to matched results', () => {
    const plainScore = scoreToolDefinition(toolDefinitions.find((tool) => tool.id === 'json-toolkit')!, 'json')
    const boostedScore = scoreToolDefinition(toolDefinitions.find((tool) => tool.id === 'json-toolkit')!, 'json', {
      favoriteToolIds: ['json-toolkit'],
      recentTools: [{ id: 'json-toolkit', count: 3 }],
    })

    expect(boostedScore).toBeGreaterThan(plainScore)
  })
})
