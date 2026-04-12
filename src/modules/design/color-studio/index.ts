import { defineAsyncComponent } from 'vue'
import {
  colorStudioRuntimeModule,
  type ColorStudioInput,
  type ColorStudioOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const colorStudioModule: ToolModule<ColorStudioInput, ColorStudioOutput> = {
  ...colorStudioRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
