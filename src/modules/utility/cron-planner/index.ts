import { defineAsyncComponent } from 'vue'
import {
  cronPlannerRuntimeModule,
  type CronPlannerInput,
  type CronPlannerOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const cronPlannerModule: ToolModule<CronPlannerInput, CronPlannerOutput> = {
  ...cronPlannerRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
