export interface WeatherLocation {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

export interface WeatherCurrent {
  temperature: number
  apparentTemperature: number
  windSpeed: number
  humidity: number
  code: number
  label: string
}

export interface WeatherDaily {
  date: string
  code: number
  label: string
  min: number
  max: number
  precipitationProbability: number
}

export function buildWeatherSearchUrl(query: string) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', query)
  url.searchParams.set('count', '5')
  url.searchParams.set('language', 'zh')
  url.searchParams.set('format', 'json')
  return url.toString()
}

export function buildWeatherForecastUrl(latitude: number, longitude: number) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m'
  )
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  )
  return url.toString()
}

export function getWeatherCodeLabel(code: number) {
  const map: Record<number, string> = {
    0: '晴朗',
    1: '基本晴',
    2: '局部多云',
    3: '阴天',
    45: '雾',
    48: '冻雾',
    51: '毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    80: '阵雨',
    95: '雷暴',
  }

  return map[code] || '天气变化'
}

export function normalizeWeatherLocations(payload: { results?: Array<Record<string, unknown>> }) {
  return (payload.results || []).map((item) => ({
    id: Number(item.id || 0),
    name: String(item.name || ''),
    latitude: Number(item.latitude || 0),
    longitude: Number(item.longitude || 0),
    country: item.country ? String(item.country) : undefined,
    admin1: item.admin1 ? String(item.admin1) : undefined,
  }))
}

export function normalizeWeatherForecast(payload: {
  current?: Record<string, unknown>
  daily?: Record<string, unknown>
}) {
  const current = payload.current || {}
  const daily = payload.daily || {}
  const weatherCodes = Array.isArray(daily.weather_code) ? daily.weather_code.map(Number) : []
  const dates = Array.isArray(daily.time) ? daily.time.map(String) : []
  const max = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max.map(Number) : []
  const min = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min.map(Number) : []
  const precipitation = Array.isArray(daily.precipitation_probability_max)
    ? daily.precipitation_probability_max.map(Number)
    : []

  const currentWeather: WeatherCurrent = {
    temperature: Number(current.temperature_2m || 0),
    apparentTemperature: Number(current.apparent_temperature || 0),
    windSpeed: Number(current.wind_speed_10m || 0),
    humidity: Number(current.relative_humidity_2m || 0),
    code: Number(current.weather_code || 0),
    label: getWeatherCodeLabel(Number(current.weather_code || 0)),
  }

  const dailyItems: WeatherDaily[] = dates.map((date, index) => ({
    date,
    code: weatherCodes[index] || 0,
    label: getWeatherCodeLabel(weatherCodes[index] || 0),
    min: min[index] || 0,
    max: max[index] || 0,
    precipitationProbability: precipitation[index] || 0,
  }))

  return { current: currentWeather, daily: dailyItems }
}
