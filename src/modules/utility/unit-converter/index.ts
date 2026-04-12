import { defineAsyncComponent } from 'vue'
import {
  unitConverterRuntimeModule,
  type UnitConverterInput,
  type UnitConverterOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const unitConverterModule: ToolModule<UnitConverterInput, UnitConverterOutput> = {
  ...unitConverterRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
