import { defineAsyncComponent } from 'vue'
import {
  weatherDeskRuntimeModule,
  type WeatherDeskInput,
  type WeatherDeskOutput,
} from './module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export const weatherDeskModule: ToolModule<WeatherDeskInput, WeatherDeskOutput> = {
  ...weatherDeskRuntimeModule,
  loader: () => import('./page.vue'),
  page: defineAsyncComponent(() => import('./page.vue')),
}
