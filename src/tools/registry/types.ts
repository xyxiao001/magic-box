import type { ToolCategory } from './categories'

export type ToolCapabilityTag =
  | 'offline-ready'
  | 'network-required'
  | 'local-processing'
  | 'beta'
  | 'favorite-supported'
  | 'history-supported'

export interface ToolDefinition {
  id: string
  title: string
  description: string
  category: ToolCategory
  path: string
  keywords: string[]
  tags: ToolCapabilityTag[]
  order?: number
  hidden?: boolean
  searchableText?: string
  loader: () => Promise<unknown>
}
