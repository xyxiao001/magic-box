import { defineAsyncComponent } from 'vue'
import {
  calculatorProRuntimeModule,
  type CalculatorProInput,
  type CalculatorProOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const calculatorProModule: ToolModule<CalculatorProInput, CalculatorProOutput> = {
  ...calculatorProRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
