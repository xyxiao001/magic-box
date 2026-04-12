import { defineAsyncComponent } from 'vue'
import { requestConverterRuntimeModule, type RequestConverterInput, type RequestConverterOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const requestConverterModule: ToolModule<RequestConverterInput, RequestConverterOutput> = {
  ...requestConverterRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
