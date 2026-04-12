import type { Component } from 'vue'
import type { ToolModuleMeta } from '@/tool-runtime/protocols/tool-module'

export interface ToolRegistryModule {
  meta: ToolModuleMeta
  loader?: () => Promise<unknown>
  page: Component
}
