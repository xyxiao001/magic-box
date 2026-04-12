import { defineAsyncComponent } from 'vue'
import {
  whiteNoiseStudioRuntimeModule,
  type WhiteNoiseStudioInput,
  type WhiteNoiseStudioOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const whiteNoiseStudioModule: ToolModule<WhiteNoiseStudioInput, WhiteNoiseStudioOutput> = {
  ...whiteNoiseStudioRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
