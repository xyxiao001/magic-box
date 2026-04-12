import { describe, expect, it, vi } from 'vitest'
import {
  buildWeatherDeskHistoryLabel,
  createWeatherDeskInitialInput,
  executeWeatherDesk,
  weatherDeskSamples,
} from './module'

describe('weather desk module', () => {
  it('searches city and loads forecast', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 1, name: 'Hangzhou', latitude: 30.2, longitude: 120.2, country: 'China', admin1: 'Zhejiang' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 20,
            apparent_temperature: 21,
            weather_code: 1,
            wind_speed_10m: 5,
            relative_humidity_2m: 60,
          },
          daily: {
            time: ['2026-04-09'],
            weather_code: [1],
            temperature_2m_max: [25],
            temperature_2m_min: [15],
            precipitation_probability_max: [10],
          },
        }),
      })

    vi.stubGlobal('fetch', fetchMock)

    const output = await executeWeatherDesk(createWeatherDeskInitialInput())

    expect(output.searchResults).toHaveLength(1)
    expect(output.currentWeather?.label).toBe('基本晴')
    expect(output.dailyForecast[0]?.max).toBe(25)
  })

  it('builds history labels and exposes samples', () => {
    expect(buildWeatherDeskHistoryLabel({ cityQuery: 'Hangzhou', selectedLocation: null }, { searchResults: [], selectedLocation: null, currentWeather: null, dailyForecast: [] })).toBe('Hangzhou')
    expect(weatherDeskSamples).toHaveLength(2)
  })
})
