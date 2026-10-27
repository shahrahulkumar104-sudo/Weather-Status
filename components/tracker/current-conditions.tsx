import { Cloud, Droplets, Gauge, Leaf, Thermometer, Wind } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AirQuality, CurrentConditions as Current } from '@/lib/weather'
import { cn } from '@/lib/utils'

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Heavy showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
}

function aqiStatus(aqi: number) {
  if (aqi <= 50) return { label: 'Good', className: 'bg-emerald-100 text-emerald-800' }
  if (aqi <= 100) return { label: 'Moderate', className: 'bg-amber-100 text-amber-800' }
  if (aqi <= 150) return { label: 'Unhealthy for sensitive groups', className: 'bg-orange-100 text-orange-800' }
  if (aqi <= 200) return { label: 'Unhealthy', className: 'bg-red-100 text-red-800' }
  return { label: 'Very unhealthy', className: 'bg-red-200 text-red-900' }
}

export function CurrentConditions({
  current,
  airQuality,
}: {
  current: Current
  airQuality: AirQuality | null
}) {
  const metrics = [
    { icon: Droplets, label: 'Humidity', value: `${Math.round(current.humidity)}%` },
    { icon: Gauge, label: 'Pressure', value: `${Math.round(current.pressure)} hPa` },
    { icon: Wind, label: 'Wind', value: `${Math.round(current.windSpeed)} km/h` },
    { icon: Cloud, label: 'Cloud cover', value: `${Math.round(current.cloudCover)}%` },
  ]
  const aqi = airQuality?.usAqi ?? null
  const status = aqi !== null ? aqiStatus(aqi) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current status</CardTitle>
        <CardDescription>
          {WEATHER_CODES[current.weatherCode] ?? 'Conditions'} · updated{' '}
          {new Date(current.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Thermometer className="size-6 text-primary" aria-hidden="true" />
          <span className="font-mono text-5xl font-semibold tracking-tight tabular-nums">
            {Math.round(current.temperature)}°
          </span>
          <span className="text-sm text-muted-foreground">C</span>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {metrics.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg bg-muted p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-1 font-mono text-sm font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        {status && (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Leaf className="size-4 text-chart-2" aria-hidden="true" />
              <div>
                <p className="text-xs text-muted-foreground">Air quality (US AQI)</p>
                <p className="font-mono text-sm font-medium tabular-nums">
                  {Math.round(aqi as number)}
                  {airQuality?.pm25 != null && (
                    <span className="text-muted-foreground"> · PM2.5 {airQuality.pm25.toFixed(0)}</span>
                  )}
                </p>
              </div>
            </div>
            <span className={cn('rounded-full px-2 py-0.5 text-right text-xs font-medium', status.className)}>
              {status.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
