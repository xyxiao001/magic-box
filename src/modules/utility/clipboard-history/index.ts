import { defineAsyncComponent } from 'vue'
import {
  clipboardHistoryRuntimeModule,
  type ClipboardHistoryInput,
  type ClipboardHistoryOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const clipboardHistoryModule: ToolModule<ClipboardHistoryInput, ClipboardHistoryOutput> = {
  ...clipboardHistoryRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
