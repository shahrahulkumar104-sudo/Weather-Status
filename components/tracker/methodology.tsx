import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RAIN_THRESHOLD_MM } from '@/lib/analysis'

const steps = [
  {
    title: 'Collect',
    body: 'Pull the last 60 days of daily humidity, pressure, cloud cover, temperature and rainfall for the selected place.',
  },
  {
    title: 'Label',
    body: `Mark each day as rainy when at least ${RAIN_THRESHOLD_MM} mm of precipitation was recorded.`,
  },
  {
    title: 'Fit',
    body: 'Train a regularised logistic regression on standardised features, plus a Markov chain of rain-to-rain transitions.',
  },
  {
    title: 'Predict',
    body: 'Apply both to next week’s expected conditions and blend them 70 / 30 into a daily probability.',
  },
  {
    title: 'Validate',
    body: 'Re-train on older data and score the last two weeks to report accuracy and Brier score.',
  },
]

export function Methodology() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How the prediction works</CardTitle>
        <CardDescription>A transparent, local statistical model — recalculated on every update.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
