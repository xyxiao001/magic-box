import { defineAsyncComponent } from 'vue'
import { sqlFormatterRuntimeModule, type SqlFormatterInput, type SqlFormatterOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const sqlFormatterModule: ToolModule<SqlFormatterInput, SqlFormatterOutput> = {
  ...sqlFormatterRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
