import type { Component } from 'vue'
import type { ToolCategory } from '@/tools/registry/categories'
import type { ToolCapability } from './tool-capabilities'
import type { ToolExecutionContext, ToolValidationResult } from './tool-context'

export interface ToolSample<Input = unknown> {
  id: string
  label: string
  summary?: string
  apply: (currentInput: Input) => Input
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
  loader?: () => Promise<unknown>
  page: Component
}
