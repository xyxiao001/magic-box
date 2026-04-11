import { getVisibleToolDefinitions } from '@/tools/registry'
import type { ToolDefinition } from '@/tools/registry'

export type ToolModule = ToolDefinition

export const toolModules: ToolModule[] = getVisibleToolDefinitions()
