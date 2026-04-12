import { defineAsyncComponent } from 'vue'
import { diffStudioRuntimeModule, type DiffStudioInput, type DiffStudioOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const diffStudioModule: ToolModule<DiffStudioInput, DiffStudioOutput> = {
  ...diffStudioRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
