import { defineAsyncComponent } from 'vue'
import {
  websocketLabRuntimeModule,
  type WebsocketLabInput,
  type WebsocketLabOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const websocketLabModule: ToolModule<WebsocketLabInput, WebsocketLabOutput> = {
  ...websocketLabRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
