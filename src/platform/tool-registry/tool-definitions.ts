import { buildToolDefinitionsFromModules } from './builder'
import { platformToolModules } from './definitions'
import type { ToolDefinition } from './types'

export const rawToolDefinitions: ToolDefinition[] = buildToolDefinitionsFromModules(platformToolModules)
