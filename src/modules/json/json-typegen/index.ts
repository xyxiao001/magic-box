import { defineAsyncComponent } from 'vue'
import { jsonTypegenRuntimeModule, type JsonTypegenInput, type JsonTypegenOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const jsonTypegenModule: ToolModule<JsonTypegenInput, JsonTypegenOutput> = {
  ...jsonTypegenRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
