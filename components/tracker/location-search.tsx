'use client'

import { useEffect, useId, useState } from 'react'
import useSWR from 'swr'
import { LocateFixed, MapPin, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { GeoResult } from '@/lib/weather'

export type TrackedLocation = {
  name: string
  region?: string
  latitude: number
  longitude: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<{ results: GeoResult[] }>)

export function LocationSearch({ onSelect }: { onSelect: (location: TrackedLocation) => void }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const listId = useId()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data, isLoading } = useSWR(
    debounced.length >= 2 ? `/api/geocode?q=${encodeURIComponent(debounced)}` : null,
    fetcher,
    { keepPreviousData: true },
  )
  const results = debounced.length >= 2 ? (data?.results ?? []) : []

  const choose = (r: GeoResult) => {
    onSelect({
      name: r.name,
      region: [r.admin1, r.country].filter(Boolean).join(', '),
      latitude: r.latitude,
      longitude: r.longitude,
    })
    setQuery('')
    setOpen(false)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSelect({
          name: 'My location',
          region: `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 10000 },
    )
  }

  return (
    <div className="flex w-full items-center gap-2 md:w-auto">
      <div className="relative w-full md:w-80">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return
            if (results[0]) choose(results[0])
          }}
          placeholder="Search a city…"
          aria-label="Search for a city"
          aria-controls={listId}
          aria-expanded={open && results.length > 0}
          role="combobox"
          className="h-10 bg-card pl-9"
        />
        {open && debounced.length >= 2 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted-foreground">
                {isLoading ? 'Searching…' : 'No matching places'}
              </li>
            ) : (
              results.map((r) => (
                <li key={r.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(r)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>
                      <span className="font-medium">{r.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[r.admin1, r.country].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-10 shrink-0 bg-card"
        onClick={useMyLocation}
        disabled={locating}
        aria-label="Use my current location"
      >
        <LocateFixed className={locating ? 'animate-pulse' : undefined} aria-hidden="true" />
      </Button>
    </div>
  )
}
