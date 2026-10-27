import { CloudRain, Sun } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Analysis } from '@/lib/analysis'
import { cn } from '@/lib/utils'

export function VerdictCard({ analysis }: { analysis: Analysis }) {
  const { verdict, stats } = analysis
  const Icon = verdict.willRain ? CloudRain : Sun

  return (
    <Card
      className={cn(
        'relative h-full overflow-hidden border-0 text-primary-foreground',
        verdict.willRain ? 'bg-primary' : 'bg-[oklch(0.42_0.06_245)]',
      )}
    >
      <CardContent className="flex h-full flex-col gap-6 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs tracking-widest text-primary-foreground/70 uppercase">
              Next 7 days · Statistical verdict
            </p>
            <h2 className="text-balance text-3xl leading-tight font-semibold md:text-4xl">
              {verdict.headline}
            </h2>
          </div>
          <div
            className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-full md:size-16',
              verdict.willRain ? 'bg-primary-foreground/15' : 'bg-accent text-accent-foreground',
            )}
          >
            <Icon className="size-7 md:size-8" aria-hidden="true" />
          </div>
        </div>

        <p className="max-w-xl text-pretty leading-relaxed text-primary-foreground/85">
          {verdict.summary}
        </p>

        <dl className="mt-auto grid grid-cols-3 gap-4 border-t border-primary-foreground/20 pt-5">
          <div>
            <dt className="text-xs text-primary-foreground/70">Chance of any rain</dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums">
              {Math.round(verdict.chanceOfAnyRain * 100)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-primary-foreground/70">Expected rainy days</dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums">
              {verdict.expectedRainyDays.toFixed(1)}
              <span className="text-sm font-normal text-primary-foreground/70"> / 7</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-primary-foreground/70">Confidence</dt>
            <dd className="pt-1">
              <Badge className="bg-primary-foreground text-foreground">{verdict.confidence}</Badge>
            </dd>
          </div>
        </dl>
        <p className="text-xs text-primary-foreground/60">
          Based on {stats.sampleSize} days of observations
          {stats.backtestAccuracy !== null &&
            ` · ${Math.round(stats.backtestAccuracy * 100)}% accurate on the last ${stats.backtestSize} days`}
        </p>
      </CardContent>
    </Card>
  )
}
