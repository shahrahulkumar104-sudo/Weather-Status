'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Activity, MapPin, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Analysis } from '@/lib/analysis'
import type { WeatherBundle } from '@/lib/weather'
import { LocationSearch, type TrackedLocation } from './location-search'
import { VerdictCard } from './verdict-card'
import { CurrentConditions } from './current-conditions'
import { WeekForecast } from './week-forecast'
import { HistoryChart } from './history-chart'
import { FeatureCorrelations, StatisticsPanel, TrendList } from './statistics-panel'
import { Methodology } from './methodology'

type AnalysisResponse = { weather: WeatherBundle; analysis: Analysis }

const DEFAULT_LOCATION: TrackedLocation = {
  name: 'New Delhi',
  region: 'Delhi, India',
  latitude: 28.6139,
  longitude: 77.209,
}

async function fetcher(url: string): Promise<AnalysisResponse> {
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Failed to load data')
  return body
}

export function Dashboard() {
  const [location, setLocation] = useState<TrackedLocation>(DEFAULT_LOCATION)
  const key = `/api/analysis?lat=${location.latitude.toFixed(4)}&lon=${location.longitude.toFixed(4)}`
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30 * 60 * 1000,
  })

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="size-4" aria-hidden="true" />
            <span className="font-mono text-xs font-medium tracking-widest uppercase">
              Environment Status Tracker
            </span>
          </div>
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl font-semibold tracking-tight md:text-4xl">
            <span className="flex items-center gap-2">
              <MapPin className="size-6 text-muted-foreground" aria-hidden="true" />
              {location.name}
            </span>
            {location.region && (
              <span className="text-base font-normal text-muted-foreground">{location.region}</span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <LocationSearch onSelect={setLocation} />
          <Button
            variant="outline"
            size="icon"
            className="size-10 shrink-0 bg-card"
            onClick={() => mutate()}
            disabled={isValidating}
            aria-label="Refresh data"
          >
            <RefreshCw className={isValidating ? 'animate-spin' : undefined} aria-hidden="true" />
          </Button>
        </div>
      </header>

      {error && !data ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          <p className="font-medium text-destructive">Could not load weather data</p>
          <p className="mt-1 text-muted-foreground">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => mutate()}>
            Try again
          </Button>
        </div>
      ) : isLoading || !data ? (
        <LoadingState />
      ) : (
        <main className="flex flex-col gap-6" aria-busy={isValidating}>
          <section className="grid gap-6 lg:grid-cols-3" aria-label="Summary">
            <div className="lg:col-span-2">
              <VerdictCard analysis={data.analysis} />
            </div>
            <CurrentConditions current={data.weather.current} airQuality={data.weather.airQuality} />
          </section>

          <WeekForecast predictions={data.analysis.predictions} />

          <section className="grid gap-6 lg:grid-cols-3" aria-label="Historical analysis">
            <div className="lg:col-span-2">
              <HistoryChart history={data.weather.history} predictions={data.analysis.predictions} />
            </div>
            <StatisticsPanel analysis={data.analysis} />
          </section>

          <section className="grid gap-6 lg:grid-cols-3" aria-label="Drivers and trends">
            <FeatureCorrelations analysis={data.analysis} />
            <TrendList analysis={data.analysis} />
            <Methodology />
          </section>
        </main>
      )}

      <footer className="border-t pt-4 text-xs text-muted-foreground">
        Weather and air-quality data from Open-Meteo. Predictions are statistical estimates, not official forecasts.
      </footer>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading analysis">
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-64" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}
