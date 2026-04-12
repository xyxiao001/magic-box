<script setup lang="ts">
import { computed } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDraft } from '@/tool-runtime/composables/useToolDraft'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolHistory } from '@/tool-runtime/composables/useToolHistory'
import { useToolSamples } from '@/tool-runtime/composables/useToolSamples'
import { useToolShare } from '@/tool-runtime/composables/useToolShare'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolSamplePanel from '@/tool-runtime/scaffolds/ToolSamplePanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import {
  buildWeatherDeskHistoryLabel,
  weatherDeskRuntimeModule,
  type WeatherDeskInput,
  type WeatherDeskOutput,
} from './module'

const cityStorageDomain = 'tool-history:weather-desk:city'

const state = useToolState<WeatherDeskInput, WeatherDeskOutput>(weatherDeskRuntimeModule)
useToolDraft(weatherDeskRuntimeModule, state, {
  legacyKeys: [cityStorageDomain, 'magic-box.weather.city'],
  parseLegacy: (raw) => ({
    ...state.input.value,
    cityQuery: raw,
  }),
})
const history = useToolHistory(weatherDeskRuntimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label: buildWeatherDeskHistoryLabel(input, output ?? { searchResults: [], selectedLocation: null, currentWeather: null, dailyForecast: [] }),
    description: output?.currentWeather ? `${output.currentWeather.temperature}°C` : '',
  }),
})
const { run } = useToolExecution(weatherDeskRuntimeModule, state)
const samples = useToolSamples(weatherDeskRuntimeModule, state)
const share = useToolShare(weatherDeskRuntimeModule, state)
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const output = computed(() => state.output.value)
const locationLabel = computed(() => {
  const location = output.value?.selectedLocation
  if (!location) return '未选择城市'
  return [location.name, location.admin1, location.country].filter(Boolean).join(' · ')
})

async function searchCity() {
  state.input.value.selectedLocation = null
  const outputValue = await run()
  if (outputValue) {
    showSuccessMessage(outputValue.searchResults.length ? '请选择一个城市查看详情' : '没有找到匹配城市')
  }
}

async function selectLocation(location: NonNullable<WeatherDeskOutput['selectedLocation']>) {
  state.input.value.selectedLocation = location
  const outputValue = await run()
  if (outputValue?.currentWeather) {
    showSuccessMessage('天气已更新')
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showErrorMessage('当前环境不支持定位')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      void selectLocation({
        id: -1,
        name: '当前位置',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
    },
    () => {
      showErrorMessage('定位失败，请改用城市搜索')
    }
  )
}

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
}

function saveSnapshot() {
  if (!state.output.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}
</script>

<template>
  <ToolScaffold :meta="weatherDeskRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="state.loading.value" @click="searchCity">
          {{ state.loading.value ? '加载中...' : '查询天气' }}
        </button>
        <button type="button" class="ghost-button" @click="useCurrentLocation">使用当前位置</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="城市搜索" subtitle="支持手动搜索城市，也可使用当前位置。">
        <label class="field-row">
          <span class="field-label">城市</span>
          <input v-model="state.input.value.cityQuery" class="text-input" type="text" placeholder="例如：Hangzhou / Beijing / Tokyo" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">搜索结果</span>
          </div>

          <div v-if="output?.searchResults.length" class="jwt-template-list">
            <button
              v-for="item in output.searchResults"
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
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="查询并保存快照后，这里会记录最近查看的天气配置。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<WeatherDeskInput, WeatherDeskOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="天气详情" :subtitle="locationLabel">
        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">当前天气</span>
          </div>

          <div v-if="output?.currentWeather" class="weather-current-card">
            <strong class="weather-temp">{{ output.currentWeather.temperature }}°C</strong>
            <span class="result-value">{{ output.currentWeather.label }}</span>
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">体感温度</span>
                  <strong class="result-value">{{ output.currentWeather.apparentTemperature }}°C</strong>
                </div>
                <div>
                  <span class="result-label">风速</span>
                  <strong class="result-value">{{ output.currentWeather.windSpeed }} km/h</strong>
                </div>
              </article>
              <article class="data-row">
                <div>
                  <span class="result-label">湿度</span>
                  <strong class="result-value">{{ output.currentWeather.humidity }}%</strong>
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

          <div v-if="output?.dailyForecast.length" class="weather-forecast-list">
            <article v-for="item in output.dailyForecast" :key="item.date" class="timeline-row">
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
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
