import { defineAsyncComponent } from 'vue'
import { textToolkitRuntimeModule, type TextToolkitInput, type TextToolkitOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const textToolkitModule: ToolModule<TextToolkitInput, TextToolkitOutput> = {
  ...textToolkitRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
