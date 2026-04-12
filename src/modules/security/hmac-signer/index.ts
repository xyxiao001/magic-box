import { defineAsyncComponent } from 'vue'
import {
  hmacSignerRuntimeModule,
  type HmacSignerInput,
  type HmacSignerOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const hmacSignerModule: ToolModule<HmacSignerInput, HmacSignerOutput> = {
  ...hmacSignerRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
