import { defineAsyncComponent } from 'vue'
import {
  qrcodeStudioRuntimeModule,
  type QrcodeStudioInput,
  type QrcodeStudioOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const qrcodeStudioModule: ToolModule<QrcodeStudioInput, QrcodeStudioOutput> = {
  ...qrcodeStudioRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
