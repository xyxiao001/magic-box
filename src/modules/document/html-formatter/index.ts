import { defineAsyncComponent } from 'vue'
import { htmlFormatterRuntimeModule, type HtmlFormatterInput, type HtmlFormatterOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const htmlFormatterModule: ToolModule<HtmlFormatterInput, HtmlFormatterOutput> = {
  ...htmlFormatterRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
