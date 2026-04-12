import type { ToolDefinition } from './types'

export interface ToolDefinitionValidationResult {
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

export function validateToolDefinitionRecords(definitions: ToolDefinition[]): ToolDefinitionValidationResult {
  return {
    duplicateIds: findDuplicateValues(definitions.map((tool) => tool.id)),
    duplicatePaths: findDuplicateValues(definitions.map((tool) => tool.path)),
  }
}

export function assertValidToolDefinitionRecords(definitions: ToolDefinition[]) {
  const validation = validateToolDefinitionRecords(definitions)

  if (!validation.duplicateIds.length && !validation.duplicatePaths.length) {
    return definitions
  }

  const segments = [
    validation.duplicateIds.length ? `duplicate ids: ${validation.duplicateIds.join(', ')}` : '',
    validation.duplicatePaths.length ? `duplicate paths: ${validation.duplicatePaths.join(', ')}` : '',
  ].filter(Boolean)

  throw new Error(`Invalid tool registry definitions: ${segments.join('; ')}`)
}
