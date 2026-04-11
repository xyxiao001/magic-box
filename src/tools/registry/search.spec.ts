import { describe, expect, it } from 'vitest'
import { toolDefinitions } from '@/tools/registry'
import { scoreToolDefinition, searchToolDefinitions } from '@/tools/registry/search'

describe('tool search ranking', () => {
  it('supports alias expansion for timestamp searches', () => {
    const results = searchToolDefinitions(toolDefinitions, 'unix')

    expect(results[0]?.id).toBe('time-lab')
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
