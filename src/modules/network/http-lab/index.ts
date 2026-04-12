import { defineAsyncComponent } from 'vue'
import { httpLabRuntimeModule, type HttpLabInput, type HttpLabOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const httpLabModule: ToolModule<HttpLabInput, HttpLabOutput> = {
  ...httpLabRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
