import { defineAsyncComponent } from 'vue'
import { timeLabRuntimeModule, type TimeLabInput, type TimeLabOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const timeLabModule: ToolModule<TimeLabInput, TimeLabOutput> = {
  ...timeLabRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
