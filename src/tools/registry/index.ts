import type { RouteRecordRaw } from 'vue-router'
import { rawToolDefinitions } from './definitions'
import type { ToolDefinition } from './types'

export type { ToolCategory } from './categories'
export type { ToolCapabilityTag, ToolDefinition } from './types'
export { buildToolSearchableText, scoreToolDefinition, searchToolDefinitions } from './search'

export interface ToolRegistryValidationResult {
  duplicateIds: string[]
  duplicatePaths: string[]
}

function findDuplicateValues(values: string[]) {
  const counts = new Map<string, number>()

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort()
}

export function validateToolDefinitions(definitions: ToolDefinition[]): ToolRegistryValidationResult {
  return {
    duplicateIds: findDuplicateValues(definitions.map((tool) => tool.id)),
    duplicatePaths: findDuplicateValues(definitions.map((tool) => tool.path)),
  }
}

function assertValidToolDefinitions(definitions: ToolDefinition[]) {
  const validation = validateToolDefinitions(definitions)

  if (!validation.duplicateIds.length && !validation.duplicatePaths.length) {
    return definitions
  }

  const segments = [
    validation.duplicateIds.length ? `duplicate ids: ${validation.duplicateIds.join(', ')}` : '',
    validation.duplicatePaths.length ? `duplicate paths: ${validation.duplicatePaths.join(', ')}` : '',
  ].filter(Boolean)

  throw new Error(`Invalid tool registry definitions: ${segments.join('; ')}`)
}

export const toolDefinitions = assertValidToolDefinitions(rawToolDefinitions)

export function getVisibleToolDefinitions(definitions: ToolDefinition[] = toolDefinitions) {
  return definitions.filter((tool) => !tool.hidden)
}

export function getToolDefinitionById(id: string, definitions: ToolDefinition[] = toolDefinitions) {
  return definitions.find((tool) => tool.id === id)
}

export function createToolRoutes(definitions: ToolDefinition[] = getVisibleToolDefinitions()): RouteRecordRaw[] {
  return definitions.map((tool) => ({
    path: tool.path,
    name: tool.id,
    component: tool.loader,
    meta: {
      title: tool.title,
      category: tool.category,
      tags: tool.tags,
    },
  }))
}
