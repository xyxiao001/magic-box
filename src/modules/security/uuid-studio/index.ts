import { defineAsyncComponent } from 'vue'
import { uuidStudioRuntimeModule, type UuidStudioInput, type UuidStudioOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const uuidStudioModule: ToolModule<UuidStudioInput, UuidStudioOutput> = {
  ...uuidStudioRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
