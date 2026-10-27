import { NextResponse, type NextRequest } from 'next/server'
import { analyzeWeather } from '@/lib/analysis'
import { fetchWeather } from '@/lib/weather'

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'))
  const lon = Number(request.nextUrl.searchParams.get('lon'))

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  try {
    const weather = await fetchWeather(lat, lon)
    const analysis = analyzeWeather(weather)
    return NextResponse.json({ weather, analysis })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to analyze weather'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
