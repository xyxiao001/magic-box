import { defineAsyncComponent } from 'vue'
import { jwtStudioRuntimeModule, type JwtStudioInput, type JwtStudioOutput } from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const jwtStudioModule: ToolModule<JwtStudioInput, JwtStudioOutput> = {
  ...jwtStudioRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
