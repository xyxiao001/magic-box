import { describe, expect, it } from 'vitest'
import { searchToolDefinitions, scoreToolDefinition } from './search'
import { toolDefinitions } from './index'

describe('platform tool registry search', () => {
  it('matches expanded aliases for migrated tools', () => {
    expect(searchToolDefinitions(toolDefinitions, 'query')[0]?.id).toBe('url-inspector')
    expect(searchToolDefinitions(toolDefinitions, 'csv')[0]?.id).toBe('csv-toolkit')
    expect(searchToolDefinitions(toolDefinitions, 'sql')[0]?.id).toBe('sql-formatter')
  })

  it('boosts favorite and recent tools when query exists', () => {
    const plainScore = scoreToolDefinition(toolDefinitions.find((tool) => tool.id === 'json-toolkit')!, 'json')
    const boostedScore = scoreToolDefinition(toolDefinitions.find((tool) => tool.id === 'json-toolkit')!, 'json', {
      favoriteToolIds: ['json-toolkit'],
      recentTools: [{ id: 'json-toolkit', count: 2 }],
    })

    expect(boostedScore).toBeGreaterThan(plainScore)
  })
})
