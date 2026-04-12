import { defineAsyncComponent } from 'vue'
import { codecLabRuntimeModule, type CodecLabInput, type CodecLabOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const codecLabModule: ToolModule<CodecLabInput, CodecLabOutput> = {
  ...codecLabRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
