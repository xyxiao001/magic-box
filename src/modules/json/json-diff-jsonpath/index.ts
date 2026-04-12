import { defineAsyncComponent } from 'vue'
import {
  jsonDiffJsonPathRuntimeModule,
  type JsonDiffJsonPathInput,
  type JsonDiffJsonPathOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const jsonDiffJsonPathModule: ToolModule<JsonDiffJsonPathInput, JsonDiffJsonPathOutput> = {
  ...jsonDiffJsonPathRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
