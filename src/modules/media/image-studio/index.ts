import { defineAsyncComponent } from 'vue'
import {
  imageStudioRuntimeModule,
  type ImageStudioInput,
  type ImageStudioOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const imageStudioModule: ToolModule<ImageStudioInput, ImageStudioOutput> = {
  ...imageStudioRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
