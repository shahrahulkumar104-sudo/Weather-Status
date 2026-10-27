import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Analysis } from '@/lib/analysis'
import { cn } from '@/lib/utils'

const pct = (n: number) => `${Math.round(n * 100)}%`

export function StatisticsPanel({ analysis }: { analysis: Analysis }) {
  const { stats } = analysis
  const rows = [
    { label: 'Days analysed', value: String(stats.sampleSize) },
    { label: 'Rainy days observed', value: `${stats.rainyDays} (${pct(stats.baseRate)})` },
    { label: 'Total rainfall', value: `${stats.totalPrecipitation.toFixed(1)} mm` },
    { label: 'Avg. on rainy days', value: `${stats.meanPrecipitationOnRainyDays.toFixed(1)} mm` },
    { label: 'P(rain | rained yesterday)', value: pct(stats.rainAfterRain) },
    { label: 'P(rain | dry yesterday)', value: pct(stats.rainAfterDry) },
    {
      label: `Backtest accuracy (${stats.backtestSize} d)`,
      value: stats.backtestAccuracy !== null ? pct(stats.backtestAccuracy) : 'n/a',
    },
    {
      label: 'Brier score (lower is better)',
      value: stats.backtestBrier !== null ? stats.backtestBrier.toFixed(3) : 'n/a',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model statistics</CardTitle>
        <CardDescription>Summary of the historical sample and how well the model performs.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="font-mono font-medium tabular-nums">{r.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

export function FeatureCorrelations({ analysis }: { analysis: Analysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What drives rain here</CardTitle>
        <CardDescription>
          Correlation of each variable with rainy days. Blue bars raise the chance of rain, amber bars lower it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-4">
          {analysis.features.map((f) => {
            const width = Math.min(100, Math.abs(f.correlation) * 100)
            const positive = f.correlation >= 0
            return (
              <li key={f.key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{f.label}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    r = {f.correlation >= 0 ? '+' : ''}
                    {f.correlation.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div className="flex h-2 justify-end">
                    {!positive && <div className="h-full rounded-l-full bg-accent" style={{ width: `${width}%` }} />}
                  </div>
                  <div className="flex h-2">
                    {positive && <div className="h-full rounded-r-full bg-primary" style={{ width: `${width}%` }} />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Rainy-day avg <span className="font-mono tabular-nums">{f.rainyMean.toFixed(1)}</span> vs dry-day avg{' '}
                  <span className="font-mono tabular-nums">{f.dryMean.toFixed(1)}</span>
                </p>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

export function TrendList({ analysis }: { analysis: Analysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>14-day trends</CardTitle>
        <CardDescription>Linear regression slope of recent observations.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-3">
          {analysis.trends.map((t) => {
            const flat = Math.abs(t.slopePerDay) < 0.05
            const up = t.slopePerDay > 0
            const Icon = flat ? ArrowRight : up ? ArrowUpRight : ArrowDownRight
            return (
              <li key={t.label} className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t.label}</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {t.recentMean.toFixed(t.unit === 'hPa' ? 0 : 1)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{t.unit}</span>
                </p>
                <p
                  className={cn(
                    'mt-1 flex items-center gap-1 text-xs font-medium',
                    flat ? 'text-muted-foreground' : up ? 'text-primary' : 'text-accent-foreground',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  <span className="font-mono tabular-nums">
                    {t.slopePerDay >= 0 ? '+' : ''}
                    {t.slopePerDay.toFixed(2)}
                  </span>
                  {` ${t.unit}/day`}
                </p>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
