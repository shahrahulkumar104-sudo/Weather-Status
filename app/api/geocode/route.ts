import { NextResponse, type NextRequest } from 'next/server'
import { searchLocations } from '@/lib/weather'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (query.length < 2 || query.length > 80) return NextResponse.json({ results: [] })
  const results = await searchLocations(query)
  return NextResponse.json({ results })
}
