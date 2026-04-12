import { defineAsyncComponent } from 'vue'
import { hashStudioRuntimeModule, type HashStudioInput, type HashStudioOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const hashStudioModule: ToolModule<HashStudioInput, HashStudioOutput> = {
  ...hashStudioRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
