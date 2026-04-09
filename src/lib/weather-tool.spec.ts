import { describe, expect, it } from 'vitest'
import {
  buildWeatherForecastUrl,
  buildWeatherSearchUrl,
  getWeatherCodeLabel,
  normalizeWeatherForecast,
  normalizeWeatherLocations,
} from './weather-tool'

describe('weather helpers', () => {
  it('builds search url', () => {
    expect(buildWeatherSearchUrl('beijing')).toContain('geocoding-api.open-meteo.com')
  })

  it('builds forecast url', () => {
    expect(buildWeatherForecastUrl(39.9, 116.4)).toContain('latitude=39.9')
  })

  it('maps weather code', () => {
    expect(getWeatherCodeLabel(0)).toBe('晴朗')
  })

  it('normalizes locations', () => {
    const locations = normalizeWeatherLocations({ results: [{ id: 1, name: 'Beijing', latitude: 1, longitude: 2 }] })

    expect(locations[0]?.name).toBe('Beijing')
  })

  it('normalizes forecast', () => {
    const forecast = normalizeWeatherForecast({
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
    })

    expect(forecast.current.label).toBe('基本晴')
    expect(forecast.daily[0]?.max).toBe(25)
  })
})
