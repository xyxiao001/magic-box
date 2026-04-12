import { defineAsyncComponent } from 'vue'
import { csvToolkitRuntimeModule, type CsvToolkitInput, type CsvToolkitOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const csvToolkitModule: ToolModule<CsvToolkitInput, CsvToolkitOutput> = {
  ...csvToolkitRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
