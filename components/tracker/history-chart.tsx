'use client'

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { DailyRecord } from '@/lib/weather'
import type { DayPrediction } from '@/lib/analysis'
import { RAIN_THRESHOLD_MM } from '@/lib/analysis'

const config = {
  precipitation: { label: 'Observed rain (mm)', color: 'var(--chart-1)' },
  humidity: { label: 'Humidity (%)', color: 'var(--chart-2)' },
  probability: { label: 'Predicted rain chance (%)', color: 'var(--chart-3)' },
} satisfies ChartConfig

const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function HistoryChart({
  history,
  predictions,
}: {
  history: DailyRecord[]
  predictions: DayPrediction[]
}) {
  const data = [
    ...history.map((r) => ({
      date: r.date,
      precipitation: r.precipitation,
      humidity: Math.round(r.humidity),
      probability: null as number | null,
    })),
    ...predictions.map((p) => ({
      date: p.date,
      precipitation: null as number | null,
      humidity: Math.round(p.humidity),
      probability: Math.round(p.probability * 100),
    })),
  ]
  const forecastStart = predictions[0]?.date

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Observed data &amp; projection</CardTitle>
        <CardDescription>
          {history.length} days of recorded rainfall and humidity feeding the model, followed by next
          week&apos;s predicted rain chance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-80 w-full">
          <ComposedChart data={data} margin={{ left: -8, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              fontSize={11}
            />
            <YAxis yAxisId="mm" tickLine={false} axisLine={false} fontSize={11} width={40} />
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={32}
            />
            {forecastStart && (
              <ReferenceLine
                yAxisId="pct"
                x={forecastStart}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{ value: 'Forecast', position: 'insideTopLeft', fontSize: 11, fill: 'var(--muted-foreground)' }}
              />
            )}
            <ReferenceLine
              yAxisId="mm"
              y={RAIN_THRESHOLD_MM}
              stroke="var(--color-precipitation)"
              strokeOpacity={0.4}
              strokeDasharray="2 4"
            />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(v) => shortDate(String(v))} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar yAxisId="mm" dataKey="precipitation" fill="var(--color-precipitation)" radius={[3, 3, 0, 0]} />
            <Line
              yAxisId="pct"
              dataKey="humidity"
              stroke="var(--color-humidity)"
              strokeWidth={2}
              dot={false}
              type="monotone"
            />
            <Bar yAxisId="pct" dataKey="probability" fill="var(--color-probability)" radius={[3, 3, 0, 0]} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
