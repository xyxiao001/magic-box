import { defineAsyncComponent } from 'vue'
import { urlInspectorRuntimeModule, type UrlInspectorInput, type UrlInspectorOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const urlInspectorModule: ToolModule<UrlInspectorInput, UrlInspectorOutput> = {
  ...urlInspectorRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
