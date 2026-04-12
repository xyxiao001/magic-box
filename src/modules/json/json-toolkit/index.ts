import { defineAsyncComponent } from 'vue'
import { jsonToolkitRuntimeModule, type JsonToolkitInput, type JsonToolkitOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const jsonToolkitModule: ToolModule<JsonToolkitInput, JsonToolkitOutput> = {
  ...jsonToolkitRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
