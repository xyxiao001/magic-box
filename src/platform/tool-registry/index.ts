import type { RouteRecordRaw } from 'vue-router'
import {
  assertValidToolDefinitionRecords,
  validateToolDefinitionRecords,
} from './validator'
import { rawToolDefinitions } from './tool-definitions'
import type { ToolDefinition } from './types'

export type { ToolCategory } from '@/tools/registry/categories'
export type { ToolCapabilityTag, ToolDefinition } from './types'
export { buildToolSearchableText, scoreToolDefinition, searchToolDefinitions } from './search'

export interface ToolRegistryValidationResult {
  duplicateIds: string[]
  duplicatePaths: string[]
}

export function validateToolDefinitions(definitions: ToolDefinition[]): ToolRegistryValidationResult {
  return validateToolDefinitionRecords(definitions)
}

export const toolDefinitions = assertValidToolDefinitionRecords(rawToolDefinitions)

export function getVisibleToolDefinitions(definitions: ToolDefinition[] = toolDefinitions) {
  return definitions.filter((tool) => !tool.hidden)
}

export const toolModules = getVisibleToolDefinitions()

export function getToolDefinitionById(id: string, definitions: ToolDefinition[] = toolDefinitions) {
  return definitions.find((tool) => tool.id === id)
}

export function createToolRoutes(definitions: ToolDefinition[] = toolModules): RouteRecordRaw[] {
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
