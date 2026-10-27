import type { DailyRecord, WeatherBundle } from './weather'

export const RAIN_THRESHOLD_MM = 1

const FEATURES = [
  { key: 'humidity', label: 'Humidity' },
  { key: 'cloudCover', label: 'Cloud cover' },
  { key: 'pressure', label: 'Pressure' },
  { key: 'pressureChange', label: 'Pressure change' },
  { key: 'tempRange', label: 'Temp. range' },
] as const

type FeatureKey = (typeof FEATURES)[number]['key']
type FeatureRow = Record<FeatureKey, number>

export type DayPrediction = {
  date: string
  probability: number
  modelProbability: number
  persistenceProbability: number
  providerRainChance: number | null
  willRain: boolean
  humidity: number
  cloudCover: number
  pressure: number
  tempMax: number
  tempMin: number
}

export type FeatureInsight = {
  key: FeatureKey
  label: string
  correlation: number
  weight: number
  rainyMean: number
  dryMean: number
}

export type Trend = {
  label: string
  unit: string
  slopePerDay: number
  recentMean: number
}

export type Analysis = {
  verdict: {
    willRain: boolean
    chanceOfAnyRain: number
    expectedRainyDays: number
    confidence: 'Low' | 'Moderate' | 'High'
    headline: string
    summary: string
  }
  predictions: DayPrediction[]
  stats: {
    sampleSize: number
    rainyDays: number
    baseRate: number
    totalPrecipitation: number
    meanPrecipitationOnRainyDays: number
    rainAfterRain: number
    rainAfterDry: number
    backtestAccuracy: number | null
    backtestBrier: number | null
    backtestSize: number
  }
  features: FeatureInsight[]
  trends: Trend[]
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function std(xs: number[]) {
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) || 1
}

function pearson(xs: number[], ys: number[]) {
  const mx = mean(xs)
  const my = mean(ys)
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0
}

function linearSlope(ys: number[]) {
  const xs = ys.map((_, i) => i)
  const mx = mean(xs)
  const my = mean(ys)
  let num = 0
  let den = 0
  for (let i = 0; i < ys.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  return den ? num / den : 0
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))
const isRainy = (r: DailyRecord) => r.precipitation >= RAIN_THRESHOLD_MM

function toFeatureRows(records: DailyRecord[], previous: DailyRecord | null): FeatureRow[] {
  return records.map((r, i) => {
    const prev = i > 0 ? records[i - 1] : previous
    return {
      humidity: r.humidity,
      cloudCover: r.cloudCover,
      pressure: r.pressure,
      pressureChange: prev ? r.pressure - prev.pressure : 0,
      tempRange: r.tempMax - r.tempMin,
    }
  })
}

type Scaler = Record<FeatureKey, { mean: number; std: number }>

function fitScaler(rows: FeatureRow[]): Scaler {
  return Object.fromEntries(
    FEATURES.map(({ key }) => {
      const col = rows.map((r) => r[key])
      return [key, { mean: mean(col), std: std(col) }]
    }),
  ) as Scaler
}

const scale = (row: FeatureRow, s: Scaler) =>
  FEATURES.map(({ key }) => (row[key] - s[key].mean) / s[key].std)

type LogisticModel = { weights: number[]; bias: number; scaler: Scaler }

/** L2-regularised logistic regression trained with batch gradient descent. */
function trainLogistic(rows: FeatureRow[], labels: number[]): LogisticModel {
  const scaler = fitScaler(rows)
  const X = rows.map((r) => scale(r, scaler))
  const n = X.length
  const weights = new Array(FEATURES.length).fill(0)
  const baseRate = (labels.reduce((a, b) => a + b, 0) + 1) / (n + 2)
  let bias = Math.log(baseRate / (1 - baseRate))
  const lr = 0.1
  const lambda = 0.05

  for (let epoch = 0; epoch < 800; epoch++) {
    const grad = new Array(FEATURES.length).fill(0)
    let gradBias = 0
    for (let i = 0; i < n; i++) {
      const z = X[i].reduce((acc, x, j) => acc + x * weights[j], bias)
      const err = sigmoid(z) - labels[i]
      for (let j = 0; j < weights.length; j++) grad[j] += err * X[i][j]
      gradBias += err
    }
    for (let j = 0; j < weights.length; j++) {
      weights[j] -= lr * (grad[j] / n + lambda * weights[j])
    }
    bias -= lr * (gradBias / n)
  }
  return { weights, bias, scaler }
}

const predictLogistic = (m: LogisticModel, row: FeatureRow) =>
  sigmoid(scale(row, m.scaler).reduce((acc, x, j) => acc + x * m.weights[j], m.bias))

function transitionProbabilities(records: DailyRecord[]) {
  let rr = 0
  let r = 0
  let dr = 0
  let d = 0
  for (let i = 1; i < records.length; i++) {
    if (isRainy(records[i - 1])) {
      r++
      if (isRainy(records[i])) rr++
    } else {
      d++
      if (isRainy(records[i])) dr++
    }
  }
  return {
    rainAfterRain: (rr + 1) / (r + 2),
    rainAfterDry: (dr + 1) / (d + 2),
  }
}

const MODEL_WEIGHT = 0.7
const PERSISTENCE_WEIGHT = 0.3

function blend(model: number, persistence: number) {
  return MODEL_WEIGHT * model + PERSISTENCE_WEIGHT * persistence
}

function backtest(history: DailyRecord[]) {
  const testSize = Math.min(14, Math.floor(history.length / 4))
  const train = history.slice(0, history.length - testSize)
  const test = history.slice(history.length - testSize)
  if (train.filter(isRainy).length === 0 || testSize < 5) {
    return { accuracy: null, brier: null, size: testSize }
  }
  const model = trainLogistic(toFeatureRows(train, null), train.map((r) => (isRainy(r) ? 1 : 0)))
  const markov = transitionProbabilities(train)
  const rows = toFeatureRows(test, train[train.length - 1])

  let correct = 0
  let brier = 0
  test.forEach((day, i) => {
    const prevRainy = isRainy(i === 0 ? train[train.length - 1] : test[i - 1])
    const persistence = prevRainy ? markov.rainAfterRain : markov.rainAfterDry
    const p = blend(predictLogistic(model, rows[i]), persistence)
    const actual = isRainy(day) ? 1 : 0
    if ((p >= 0.5 ? 1 : 0) === actual) correct++
    brier += (p - actual) ** 2
  })
  return { accuracy: correct / testSize, brier: brier / testSize, size: testSize }
}

export function analyzeWeather(bundle: WeatherBundle): Analysis {
  const { history, today, nextWeek } = bundle
  const labels: number[] = history.map((r) => (isRainy(r) ? 1 : 0))
  const historyRows = toFeatureRows(history, null)
  const model = trainLogistic(historyRows, labels)
  const markov = transitionProbabilities(history)

  const rainyDays = labels.reduce((a, b) => a + b, 0)
  const baseRate = (rainyDays + 1) / (history.length + 2)

  const forecastRows = toFeatureRows(nextWeek, today)
  let persistence = isRainy(today) ? 1 : 0

  const predictions: DayPrediction[] = nextWeek.map((day, i) => {
    persistence = persistence * markov.rainAfterRain + (1 - persistence) * markov.rainAfterDry
    const modelProbability = predictLogistic(model, forecastRows[i])
    const probability = blend(modelProbability, persistence)
    return {
      date: day.date,
      probability,
      modelProbability,
      persistenceProbability: persistence,
      providerRainChance: day.providerRainChance,
      willRain: probability >= 0.5,
      humidity: day.humidity,
      cloudCover: day.cloudCover,
      pressure: day.pressure,
      tempMax: day.tempMax,
      tempMin: day.tempMin,
    }
  })

  const chanceOfAnyRain = 1 - predictions.reduce((acc, p) => acc * (1 - p.probability), 1)
  const expectedRainyDays = predictions.reduce((acc, p) => acc + p.probability, 0)
  const likelyDays = predictions.filter((p) => p.willRain)
  const willRain = likelyDays.length > 0 || expectedRainyDays >= 1.5

  const bt = backtest(history)
  const maxP = Math.max(...predictions.map((p) => p.probability))
  const minP = Math.min(...predictions.map((p) => p.probability))
  const decisiveness = willRain ? maxP : 1 - maxP
  const confidence: Analysis['verdict']['confidence'] =
    decisiveness > 0.75 && (bt.accuracy ?? 0) >= 0.7
      ? 'High'
      : decisiveness > 0.6
        ? 'Moderate'
        : 'Low'

  const dayName = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })

  const headline = willRain ? 'Yes, rain is expected next week' : 'No significant rain expected next week'
  const summary = willRain
    ? likelyDays.length > 0
      ? `Rain is most likely on ${likelyDays.map((d) => dayName(d.date)).join(', ')}. The model expects about ${expectedRainyDays.toFixed(1)} rainy days out of ${predictions.length}.`
      : `No single day crosses 50%, but the combined odds add up to about ${expectedRainyDays.toFixed(1)} rainy days — keep an umbrella handy.`
    : `Every day stays below a 50% chance (range ${Math.round(minP * 100)}–${Math.round(maxP * 100)}%). Expect mostly dry conditions.`

  const rainyRecords = history.filter(isRainy)
  const rainyRows = historyRows.filter((_, i) => labels[i] === 1)
  const dryRows = historyRows.filter((_, i) => labels[i] === 0)

  const features: FeatureInsight[] = FEATURES.map(({ key, label }, j) => ({
    key,
    label,
    correlation: pearson(
      historyRows.map((r) => r[key]),
      labels,
    ),
    weight: model.weights[j],
    rainyMean: mean(rainyRows.map((r) => r[key])),
    dryMean: mean(dryRows.map((r) => r[key])),
  })).sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))

  const recent = history.slice(-14)
  const trends: Trend[] = [
    { label: 'Humidity', unit: '%', values: recent.map((r) => r.humidity) },
    { label: 'Pressure', unit: 'hPa', values: recent.map((r) => r.pressure) },
    { label: 'Cloud cover', unit: '%', values: recent.map((r) => r.cloudCover) },
    { label: 'Precipitation', unit: 'mm', values: recent.map((r) => r.precipitation) },
  ].map(({ label, unit, values }) => ({
    label,
    unit,
    slopePerDay: linearSlope(values),
    recentMean: mean(values),
  }))

  return {
    verdict: { willRain, chanceOfAnyRain, expectedRainyDays, confidence, headline, summary },
    predictions,
    stats: {
      sampleSize: history.length,
      rainyDays,
      baseRate,
      totalPrecipitation: history.reduce((a, r) => a + r.precipitation, 0),
      meanPrecipitationOnRainyDays: mean(rainyRecords.map((r) => r.precipitation)),
      rainAfterRain: markov.rainAfterRain,
      rainAfterDry: markov.rainAfterDry,
      backtestAccuracy: bt.accuracy,
      backtestBrier: bt.brier,
      backtestSize: bt.size,
    },
    features,
    trends,
  }
}
