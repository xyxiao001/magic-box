import { defineAsyncComponent } from 'vue'
import {
  jwtSignVerifyRuntimeModule,
  type JwtSignVerifyInput,
  type JwtSignVerifyOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const jwtSignVerifyModule: ToolModule<JwtSignVerifyInput, JwtSignVerifyOutput> = {
  ...jwtSignVerifyRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
