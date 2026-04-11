<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { readStorage, writeStorage } from '@/lib/storage'
import {
  buildWeatherForecastUrl,
  buildWeatherSearchUrl,
  normalizeWeatherForecast,
  normalizeWeatherLocations,
  type WeatherCurrent,
  type WeatherDaily,
  type WeatherLocation,
} from '@/lib/weather-tool'

const cityStorageKey = 'magic-box.weather.city'
const cityStorageDomain = 'tool-history:weather-desk:city'
const cityQuery = ref(
  readStorage(cityStorageDomain, 'Hangzhou', {
    legacyKeys: [cityStorageKey],
    parseLegacy: (raw) => raw,
  })
)
const searchResults = ref<WeatherLocation[]>([])
const selectedLocation = ref<WeatherLocation | null>(null)
const currentWeather = ref<WeatherCurrent | null>(null)
const dailyForecast = ref<WeatherDaily[]>([])
const statusMessage = ref('输入城市后查询天气，或直接使用当前位置')
const isLoading = ref(false)

const locationLabel = computed(() => {
  if (!selectedLocation.value) {
    return '未选择城市'
  }

  return [selectedLocation.value.name, selectedLocation.value.admin1, selectedLocation.value.country]
    .filter(Boolean)
    .join(' · ')
})

async function searchCity(query = cityQuery.value) {
  if (!query.trim()) {
    searchResults.value = []
    return
  }

  isLoading.value = true

  try {
    const response = await fetch(buildWeatherSearchUrl(query))
    const payload = (await response.json()) as { results?: Array<Record<string, unknown>> }
    searchResults.value = normalizeWeatherLocations(payload)
    statusMessage.value = searchResults.value.length ? '请选择一个城市查看详情' : '没有找到匹配城市'
  } catch {
    statusMessage.value = '城市搜索失败，请检查网络后重试'
  } finally {
    isLoading.value = false
  }
}

async function loadForecast(location: WeatherLocation) {
  isLoading.value = true
  selectedLocation.value = location

  try {
    const response = await fetch(buildWeatherForecastUrl(location.latitude, location.longitude))
    const payload = (await response.json()) as {
      current?: Record<string, unknown>
      daily?: Record<string, unknown>
    }
    const normalized = normalizeWeatherForecast(payload)
    currentWeather.value = normalized.current
    dailyForecast.value = normalized.daily
    statusMessage.value = '天气已更新'
  } catch {
    statusMessage.value = '天气获取失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

function selectLocation(location: WeatherLocation) {
  void loadForecast(location)
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    statusMessage.value = '当前环境不支持定位'
    return
  }

  isLoading.value = true
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      await loadForecast({
        id: -1,
        name: '当前位置',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
    },
    () => {
      isLoading.value = false
      statusMessage.value = '定位失败，请改用城市搜索'
    }
  )
}

watch(cityQuery, (value) => {
  writeStorage(cityStorageDomain, value)
})

void searchCity()
</script>

<template>
  <section class="tool-page tool-page-weather">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">城市搜索</h2>
            <p class="meta-hint">支持手动搜索城市，也可使用当前位置。</p>
          </div>
        </div>

        <label class="field-row">
          <span class="field-label">城市</span>
          <input v-model="cityQuery" class="text-input" type="text" placeholder="例如：Hangzhou / Beijing / Tokyo" />
        </label>

        <div class="input-toolbar">
          <button type="button" class="solid-button" @click="searchCity()">查询天气</button>
          <button type="button" class="ghost-button" @click="useCurrentLocation">使用当前位置</button>
        </div>

        <p class="helper-text">{{ isLoading ? '加载中...' : statusMessage }}</p>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">搜索结果</span>
          </div>

          <div v-if="searchResults.length" class="jwt-template-list">
            <button
              v-for="item in searchResults"
              :key="item.id"
              type="button"
              class="http-template-card"
              @click="selectLocation(item)"
            >
              <div class="http-template-top">
                <span class="http-template-method">CITY</span>
                <span class="http-template-action">查看天气</span>
              </div>
              <strong class="http-template-title">{{ item.name }}</strong>
              <p class="http-template-summary">{{ [item.admin1, item.country].filter(Boolean).join(' · ') }}</p>
            </button>
          </div>
          <div v-else class="empty-panel">
            <p>输入城市后，这里会出现候选结果。</p>
          </div>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">天气详情</h2>
            <p class="meta-hint">{{ locationLabel }}</p>
          </div>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">当前天气</span>
          </div>

          <div v-if="currentWeather" class="weather-current-card">
            <strong class="weather-temp">{{ currentWeather.temperature }}°C</strong>
            <span class="result-value">{{ currentWeather.label }}</span>
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">体感温度</span>
                  <strong class="result-value">{{ currentWeather.apparentTemperature }}°C</strong>
                </div>
                <div>
                  <span class="result-label">风速</span>
                  <strong class="result-value">{{ currentWeather.windSpeed }} km/h</strong>
                </div>
              </article>
              <article class="data-row">
                <div>
                  <span class="result-label">湿度</span>
                  <strong class="result-value">{{ currentWeather.humidity }}%</strong>
                </div>
              </article>
            </div>
          </div>
          <div v-else class="empty-panel">
            <p>选择一个城市后，这里会显示当前天气。</p>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">未来趋势</span>
            <span class="meta-hint">展示未来几天最高/最低温和降水概率。</span>
          </div>

          <div v-if="dailyForecast.length" class="weather-forecast-list">
            <article v-for="item in dailyForecast" :key="item.date" class="timeline-row">
              <span class="timeline-index">{{ item.date.slice(5) }}</span>
              <div class="history-entry-body">
                <strong class="result-value">{{ item.label }} · {{ item.max }}° / {{ item.min }}°</strong>
                <span class="meta-hint">降水概率 {{ item.precipitationProbability }}%</span>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>获取天气后，这里会显示未来趋势。</p>
          </div>
        </section>
      </section>
    </div>
  </section>
</template>
