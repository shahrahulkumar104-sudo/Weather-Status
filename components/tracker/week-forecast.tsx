import { CloudRain, Sun, CloudSun } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DayPrediction } from '@/lib/analysis'
import { cn } from '@/lib/utils'

function DayIcon({ p }: { p: number }) {
  if (p >= 0.5) return <CloudRain className="size-6 text-primary" aria-hidden="true" />
  if (p >= 0.3) return <CloudSun className="size-6 text-muted-foreground" aria-hidden="true" />
  return <Sun className="size-6 text-accent" aria-hidden="true" />
}

export function WeekForecast({ predictions }: { predictions: DayPrediction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Day-by-day rain probability</CardTitle>
        <CardDescription>
          Our statistical estimate for each day, compared with the weather service&apos;s own forecast.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {predictions.map((day) => {
            const date = new Date(`${day.date}T12:00:00`)
            const pct = Math.round(day.probability * 100)
            return (
              <li
                key={day.date}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border p-4',
                  day.willRain ? 'border-primary/40 bg-primary/5' : 'bg-card',
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <DayIcon p={day.probability} />
                </div>

                <div>
                  <p className="font-mono text-2xl font-semibold tabular-nums">{pct}%</p>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Rain probability ${pct}%`}
                  >
                    <div
                      className={cn('h-full rounded-full', day.willRain ? 'bg-primary' : 'bg-chart-4')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={cn('mt-2 text-xs font-medium', day.willRain ? 'text-primary' : 'text-muted-foreground')}>
                    {day.willRain ? 'Rain likely' : 'Likely dry'}
                  </p>
                </div>

                <dl className="mt-auto flex flex-col gap-1 border-t pt-3 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Temp</dt>
                    <dd className="font-mono tabular-nums">
                      {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Humidity</dt>
                    <dd className="font-mono tabular-nums">{Math.round(day.humidity)}%</dd>
                  </div>
                  {day.providerRainChance !== null && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Service</dt>
                      <dd className="font-mono tabular-nums">{day.providerRainChance}%</dd>
                    </div>
                  )}
                </dl>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
