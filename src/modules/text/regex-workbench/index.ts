import { defineAsyncComponent } from 'vue'
import {
  regexWorkbenchRuntimeModule,
  type RegexWorkbenchInput,
  type RegexWorkbenchOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const regexWorkbenchModule: ToolModule<RegexWorkbenchInput, RegexWorkbenchOutput> = {
  ...regexWorkbenchRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
