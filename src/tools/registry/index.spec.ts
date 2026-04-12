import { describe, expect, it } from 'vitest'
import {
  createToolRoutes,
  getToolDefinitionById,
  getVisibleToolDefinitions,
  toolDefinitions,
  validateToolDefinitions,
} from '@/tools/registry'

describe('tool registry', () => {
  it('keeps tool ids and paths unique', () => {
    expect(validateToolDefinitions(toolDefinitions)).toEqual({
      duplicateIds: [],
      duplicatePaths: [],
    })
  })

  it('exposes visible tools in definition order', () => {
    const visibleTools = getVisibleToolDefinitions()

    expect(visibleTools).toHaveLength(toolDefinitions.length)
    expect(visibleTools[0]?.id).toBe('qrcode-studio')
    expect(visibleTools.at(-1)?.id).toBe('weather-desk')
  })

  it('creates lazy routes from tool definitions', () => {
    const toolRoutes = createToolRoutes()
    const timeLab = toolRoutes.find((route) => route.name === 'time-lab')

    expect(toolRoutes).toHaveLength(toolDefinitions.length)
    expect(timeLab).toMatchObject({
      path: '/tools/time-lab',
      name: 'time-lab',
      meta: {
        title: 'Time Lab',
        category: '时间',
      },
    })
    expect(typeof timeLab?.component).toBe('function')
  })

  it('looks up tool definitions by id', () => {
    expect(getToolDefinitionById('uuid-studio')).toMatchObject({
      id: 'uuid-studio',
      path: '/tools/uuid-studio',
      title: 'UUID / NanoID Studio',
    })
  })
})
