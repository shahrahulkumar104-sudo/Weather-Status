export type DailyRecord = {
  date: string
  precipitation: number
  humidity: number
  pressure: number
  cloudCover: number
  tempMax: number
  tempMin: number
  windMax: number
  providerRainChance: number | null
}

export type CurrentConditions = {
  time: string
  temperature: number
  humidity: number
  pressure: number
  windSpeed: number
  cloudCover: number
  precipitation: number
  weatherCode: number
}

export type AirQuality = {
  usAqi: number | null
  pm25: number | null
  pm10: number | null
}

export type WeatherBundle = {
  timezone: string
  history: DailyRecord[]
  today: DailyRecord
  nextWeek: DailyRecord[]
  current: CurrentConditions
  airQuality: AirQuality | null
}

const HISTORY_DAYS = 60
const FORECAST_DAYS = 8

type OpenMeteoResponse = {
  timezone: string
  current: {
    time: string
    temperature_2m: number
    relative_humidity_2m: number
    pressure_msl: number
    wind_speed_10m: number
    cloud_cover: number
    precipitation: number
    weather_code: number
  }
  daily: {
    time: string[]
    precipitation_sum: (number | null)[]
    relative_humidity_2m_mean: (number | null)[]
    pressure_msl_mean: (number | null)[]
    cloud_cover_mean: (number | null)[]
    temperature_2m_max: (number | null)[]
    temperature_2m_min: (number | null)[]
    wind_speed_10m_max: (number | null)[]
    precipitation_probability_max: (number | null)[]
  }
}

export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherBundle> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: [
      'precipitation_sum',
      'relative_humidity_2m_mean',
      'pressure_msl_mean',
      'cloud_cover_mean',
      'temperature_2m_max',
      'temperature_2m_min',
      'wind_speed_10m_max',
      'precipitation_probability_max',
    ].join(','),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'pressure_msl',
      'wind_speed_10m',
      'cloud_cover',
      'precipitation',
      'weather_code',
    ].join(','),
    past_days: String(HISTORY_DAYS),
    forecast_days: String(FORECAST_DAYS),
    timezone: 'auto',
  })

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    next: { revalidate: 1800 },
  })
  if (!res.ok) throw new Error(`Weather service responded with ${res.status}`)
  const data = (await res.json()) as OpenMeteoResponse

  const d = data.daily
  const records: (DailyRecord | null)[] = d.time.map((date, i) => {
    const values = [
      d.precipitation_sum[i],
      d.relative_humidity_2m_mean[i],
      d.pressure_msl_mean[i],
      d.cloud_cover_mean[i],
      d.temperature_2m_max[i],
      d.temperature_2m_min[i],
      d.wind_speed_10m_max[i],
    ]
    if (values.some((v) => v === null || Number.isNaN(v))) return null
    return {
      date,
      precipitation: d.precipitation_sum[i] as number,
      humidity: d.relative_humidity_2m_mean[i] as number,
      pressure: d.pressure_msl_mean[i] as number,
      cloudCover: d.cloud_cover_mean[i] as number,
      tempMax: d.temperature_2m_max[i] as number,
      tempMin: d.temperature_2m_min[i] as number,
      windMax: d.wind_speed_10m_max[i] as number,
      providerRainChance: d.precipitation_probability_max[i],
    }
  })

  const todayIndex = HISTORY_DAYS
  const history = records.slice(0, todayIndex).filter((r): r is DailyRecord => r !== null)
  const today = records[todayIndex]
  const nextWeek = records.slice(todayIndex + 1).filter((r): r is DailyRecord => r !== null)

  if (!today || history.length < 20 || nextWeek.length === 0) {
    throw new Error('Not enough weather data available for this location')
  }

  return {
    timezone: data.timezone,
    history,
    today,
    nextWeek,
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      pressure: data.current.pressure_msl,
      windSpeed: data.current.wind_speed_10m,
      cloudCover: data.current.cloud_cover,
      precipitation: data.current.precipitation,
      weatherCode: data.current.weather_code,
    },
    airQuality: await fetchAirQuality(latitude, longitude),
  }
}

async function fetchAirQuality(latitude: number, longitude: number): Promise<AirQuality | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'us_aqi,pm2_5,pm10',
    })
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`, {
      next: { revalidate: 1800 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      current?: { us_aqi?: number | null; pm2_5?: number | null; pm10?: number | null }
    }
    return {
      usAqi: data.current?.us_aqi ?? null,
      pm25: data.current?.pm2_5 ?? null,
      pm10: data.current?.pm10 ?? null,
    }
  } catch {
    return null
  }
}

export type GeoResult = {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

export async function searchLocations(query: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({ name: query, count: '6', language: 'en', format: 'json' })
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`)
  if (!res.ok) return []
  const data = (await res.json()) as { results?: GeoResult[] }
  return (data.results ?? []).map(({ id, name, latitude, longitude, country, admin1 }) => ({
    id,
    name,
    latitude,
    longitude,
    country,
    admin1,
  }))
}
