import { defineAsyncComponent } from 'vue'
import {
  markdownStudioRuntimeModule,
  type MarkdownStudioInput,
  type MarkdownStudioOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const markdownStudioModule: ToolModule<MarkdownStudioInput, MarkdownStudioOutput> = {
  ...markdownStudioRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
