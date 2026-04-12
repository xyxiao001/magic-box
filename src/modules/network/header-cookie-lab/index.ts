import { defineAsyncComponent } from 'vue'
import {
  headerCookieLabRuntimeModule,
  type HeaderCookieLabInput,
  type HeaderCookieLabOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const headerCookieLabModule: ToolModule<HeaderCookieLabInput, HeaderCookieLabOutput> = {
  ...headerCookieLabRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
