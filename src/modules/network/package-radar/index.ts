import { defineAsyncComponent } from 'vue'
import {
  packageRadarRuntimeModule,
  type PackageRadarInput,
  type PackageRadarOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const packageRadarModule: ToolModule<PackageRadarInput, PackageRadarOutput> = {
  ...packageRadarRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
