import type { Component } from 'vue'
import type { ToolCategory } from '@/tools/registry/categories'
import type { ToolCapability } from './tool-capabilities'
import type { ToolExecutionContext, ToolValidationResult } from './tool-context'
import type { ToolDownloadPayload } from '../services/tool-download-service'

export interface ToolSample<Input = unknown> {
  id: string
  label: string
  summary?: string
  apply: (currentInput: Input) => Input
}

export interface ToolHistoryEntryMeta {
  label: string
  description?: string
}

export interface ToolRuntimeHistoryConfig<Input = unknown, Output = unknown> {
  limit?: number
  emptyText?: string
  mode?: 'on-success' | 'manual'
  actionLabel?: string
  buildEntryMeta?: (input: Input, output: Output | null) => ToolHistoryEntryMeta
}

export interface ToolRuntimeDraftConfig<Input = unknown> {
  legacyKeys?: string[]
  parseLegacy?: (raw: string, legacyKey: string) => Input | undefined
  resetLabel?: string
}

export interface ToolRuntimeDownloadConfig<Input = unknown, Output = unknown> {
  label?: string
  buildPayload: (input: Input, output: Output | null) => ToolDownloadPayload | null
  unavailableMessage?: string
  buildSuccessMessage?: (payload: ToolDownloadPayload) => string
}

export interface ToolRuntimeShareConfig<Input = unknown, Output = unknown, SharedState = unknown> {
  label?: string
  autoRunOnRestore?: boolean
  buildShareState?: (input: Input, output: Output | null) => SharedState | null
  applySharedState?: (sharedState: SharedState, input: Input) => Input
  unavailableMessage?: string
  buildSuccessMessage?: (shareUrl: string) => string
}

export interface ToolRuntimeCopyOutputConfig<Input = unknown, Output = unknown> {
  label?: string
  buildText: (input: Input, output: Output | null) => string | null
  unavailableMessage?: string
  buildSuccessMessage?: (copiedText: string) => string
}

export interface ToolRuntimeConfig<Input = unknown, Output = unknown> {
  history?: ToolRuntimeHistoryConfig<Input, Output>
  draft?: ToolRuntimeDraftConfig<Input>
  download?: ToolRuntimeDownloadConfig<Input, Output>
  share?: ToolRuntimeShareConfig<Input, Output>
  copyOutput?: ToolRuntimeCopyOutputConfig<Input, Output>
}

export interface ToolModuleMeta {
  id: string
  title: string
  category: ToolCategory
  group: string
  path: string
  description: string
  keywords: string[]
  aliases?: string[]
  tags?: string[]
  status?: 'stable' | 'beta' | 'experimental'
  capabilities?: ToolCapability[]
  search?: {
    commonQueries?: string[]
    searchableText?: string
  }
  order?: number
}

export interface ToolModule<Input = unknown, Output = unknown> {
  meta: ToolModuleMeta
  createInitialInput: () => Input
  execute?: (input: Input, context: ToolExecutionContext) => Output | Promise<Output>
  validate?: (input: Input) => ToolValidationResult
  samples?: ToolSample<Input>[]
  runtime?: ToolRuntimeConfig<Input, Output>
  loader?: () => Promise<unknown>
  page: Component
}
