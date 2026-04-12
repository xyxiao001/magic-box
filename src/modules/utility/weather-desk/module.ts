import {
  buildWeatherForecastUrl,
  buildWeatherSearchUrl,
  normalizeWeatherForecast,
  normalizeWeatherLocations,
  type WeatherCurrent,
  type WeatherDaily,
  type WeatherLocation,
} from './logic'
import { weatherDeskMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface WeatherDeskInput {
  cityQuery: string
  selectedLocation: WeatherLocation | null
}

export interface WeatherDeskOutput {
  searchResults: WeatherLocation[]
  selectedLocation: WeatherLocation | null
  currentWeather: WeatherCurrent | null
  dailyForecast: WeatherDaily[]
}

export const weatherDeskSamples: ToolSample<WeatherDeskInput>[] = [
  {
    id: 'hangzhou',
    label: 'Hangzhou',
    summary: '适合作为默认演示城市，结果通常比较稳定。',
    apply: () => ({
      cityQuery: 'Hangzhou',
      selectedLocation: null,
    }),
  },
  {
    id: 'beijing',
    label: 'Beijing',
    summary: '适合看大城市搜索候选和天气趋势。',
    apply: () => ({
      cityQuery: 'Beijing',
      selectedLocation: null,
    }),
  },
]

export function createWeatherDeskInitialInput(): WeatherDeskInput {
  return {
    cityQuery: 'Hangzhou',
    selectedLocation: null,
  }
}

export async function executeWeatherDesk(input: WeatherDeskInput): Promise<WeatherDeskOutput> {
  const query = input.cityQuery.trim()
  if (!query && !input.selectedLocation) {
    throw new Error('请输入城市名或使用当前位置')
  }

  let searchResults: WeatherLocation[] = []
  let selectedLocation = input.selectedLocation

  if (query) {
    const searchResponse = await fetch(buildWeatherSearchUrl(query))
    if (!searchResponse.ok) {
      throw new Error('城市搜索失败，请检查网络后重试')
    }
    const searchPayload = await searchResponse.json()
    searchResults = normalizeWeatherLocations(searchPayload)

    if (!selectedLocation && searchResults.length) {
      selectedLocation = searchResults[0] || null
    }
  }

  if (!selectedLocation) {
    return {
      searchResults,
      selectedLocation: null,
      currentWeather: null,
      dailyForecast: [],
    }
  }

  const forecastResponse = await fetch(
    buildWeatherForecastUrl(selectedLocation.latitude, selectedLocation.longitude)
  )
  if (!forecastResponse.ok) {
    throw new Error('天气获取失败，请稍后重试')
  }

  const forecastPayload = await forecastResponse.json()
  const normalized = normalizeWeatherForecast(forecastPayload)

  return {
    searchResults,
    selectedLocation,
    currentWeather: normalized.current,
    dailyForecast: normalized.daily,
  }
}

export function buildWeatherDeskHistoryLabel(input: WeatherDeskInput, output: WeatherDeskOutput) {
  return output.selectedLocation?.name || input.cityQuery || '天气配置'
}

export const weatherDeskRuntimeModule: Omit<ToolModule<WeatherDeskInput, WeatherDeskOutput>, 'page'> = {
  meta: weatherDeskMeta,
  createInitialInput: createWeatherDeskInitialInput,
  execute: async (input) => executeWeatherDesk(input),
  samples: weatherDeskSamples,
}
