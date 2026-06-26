'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/context'

declare global {
  interface Window {
    __gmapInit?: () => void
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps) { resolve(); return }
    window.__gmapInit = resolve
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__gmapInit`
    s.async = true
    document.head.appendChild(s)
  })
}

function boundsFrom(lat: number, lng: number, km: number) {
  const latD = km / 111
  const lngD = km / (111 * Math.cos((lat * Math.PI) / 180))
  return {
    sw: `${(lat - latD).toFixed(6)},${(lng - lngD).toFixed(6)}`,
    ne: `${(lat + latD).toFixed(6)},${(lng + lngD).toFixed(6)}`,
    south: lat - latD, west: lng - lngD,
    north: lat + latD, east: lng + lngD,
  }
}

export default function NewGoogleScrapeButton() {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [radiusKm, setRadiusKm] = useState(5)
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [coordsSw, setCoordsSw] = useState('')
  const [coordsNe, setCoordsNe] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [drawMode, setDrawMode] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)

  const mapDivRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rectRef = useRef<any>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const centerRef = useRef<{ lat: number; lng: number } | null>(null)
  const radiusRef = useRef(5)
  const drawStartRef = useRef<{ lat: number; lng: number } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawListenersRef = useRef<any[]>([])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  function applyBounds(lat: number, lng: number, km: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google.maps
    const b = boundsFrom(lat, lng, km)
    setCoordsSw(b.sw)
    setCoordsNe(b.ne)
    const latlngBounds = new G.LatLngBounds(
      { lat: b.south, lng: b.west },
      { lat: b.north, lng: b.east },
    )
    if (rectRef.current) {
      rectRef.current.setBounds(latlngBounds)
    } else {
      rectRef.current = new G.Rectangle({
        bounds: latlngBounds,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        strokeColor: '#2563eb',
        strokeWeight: 2,
        map: mapRef.current,
      })
    }
    mapRef.current?.fitBounds(latlngBounds)
  }

  useEffect(() => {
    if (!open || !apiKey) return
    let cancelled = false

    loadGoogleMaps(apiKey).then(() => {
      if (cancelled || !mapDivRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const G = (window as any).google.maps
      mapRef.current = new G.Map(mapDivRef.current, {
        center: { lat: 52.23, lng: 21.01 },
        zoom: 6,
        disableDefaultUI: true,
        zoomControl: true,
      })

      if (searchRef.current) {
        const ac = new G.places.Autocomplete(searchRef.current, { types: ['(cities)'] })
        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          const loc = place.geometry?.location
          if (!loc) return
          const c = { lat: loc.lat(), lng: loc.lng() }
          centerRef.current = c
          setCenter(c)
          applyBounds(c.lat, c.lng, radiusRef.current)
        })
      }
    })

    return () => {
      cancelled = true
      rectRef.current = null
      mapRef.current = null
    }
  // applyBounds uses only refs, safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, apiKey])

  function handleRadiusChange(km: number) {
    radiusRef.current = km
    setRadiusKm(km)
    if (centerRef.current) applyBounds(centerRef.current.lat, centerRef.current.lng, km)
  }

  function clearDrawListeners() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps
    if (G) {
      drawListenersRef.current.forEach((l) => G.event.removeListener(l))
    }
    drawListenersRef.current = []
  }

  function updateDrawRect(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google.maps
    const south = Math.min(start.lat, end.lat)
    const north = Math.max(start.lat, end.lat)
    const west = Math.min(start.lng, end.lng)
    const east = Math.max(start.lng, end.lng)
    const bounds = new G.LatLngBounds({ lat: south, lng: west }, { lat: north, lng: east })

    if (rectRef.current) {
      rectRef.current.setBounds(bounds)
    } else {
      rectRef.current = new G.Rectangle({
        bounds,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        strokeColor: '#2563eb',
        strokeWeight: 2,
        map: mapRef.current,
      })
    }

    setCoordsSw(`${south.toFixed(6)},${west.toFixed(6)}`)
    setCoordsNe(`${north.toFixed(6)},${east.toFixed(6)}`)
  }

  function enableDrawMode() {
    if (!mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google.maps
    const map = mapRef.current

    map.setOptions({ draggable: false })

    const downListener = G.event.addListener(map, 'mousedown', (e: { latLng: { lat: () => number; lng: () => number } }) => {
      const start = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      drawStartRef.current = start
      setIsDrawing(true)

      if (rectRef.current) {
        rectRef.current.setMap(null)
        rectRef.current = null
      }
    })

    const moveListener = G.event.addListener(map, 'mousemove', (e: { latLng: { lat: () => number; lng: () => number } }) => {
      if (!drawStartRef.current) return
      updateDrawRect(drawStartRef.current, { lat: e.latLng.lat(), lng: e.latLng.lng() })
    })

    const upListener = G.event.addListener(map, 'mouseup', () => {
      if (drawStartRef.current) {
        drawStartRef.current = null
        setIsDrawing(false)
        setCenter({ lat: 0, lng: 0 })
      }
    })

    drawListenersRef.current = [downListener, moveListener, upListener]
  }

  function disableDrawMode() {
    clearDrawListeners()
    drawStartRef.current = null
    setIsDrawing(false)
    if (mapRef.current) {
      mapRef.current.setOptions({ draggable: true })
    }
  }

  function toggleDrawMode() {
    const next = !drawMode
    setDrawMode(next)
    if (next) {
      enableDrawMode()
    } else {
      disableDrawMode()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) { setError(t('scrapeEmptyQuery')); return }
    setSubmitting(true)
    setError('')
    try {
      const params: Record<string, string> = { query: query.trim() }
      if (coordsSw && coordsNe) {
        params.coords_sw = coordsSw
        params.coords_ne = coordsNe
      }
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: 'scrape_google_maps', params }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? t('scrapeServerError'))
      }
      const { runId } = await res.json()
      setOpen(false)
      router.push(`/dashboard/runs/${runId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('scrapeUnknownError'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    disableDrawMode()
    setDrawMode(false)
    setOpen(false)
    setError('')
    setCenter(null)
    centerRef.current = null
    setCoordsSw('')
    setCoordsNe('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
      >
        {t('scrapeButton')}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card)' }}>
            <div className="p-6">
              <h2 className="font-semibold text-lg mb-4">{t('scrapeTitle')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>{t('scrapeQueryLabel')}</label>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('scrapeQueryPlaceholder')}
                    required
                    className="w-full border rounded px-3 py-2 text-sm"
                    style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                  />
                </div>

                {apiKey ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        {t('scrapeAreaLabel')} <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>{t('scrapeAreaOptional')}</span>
                      </label>
                      <button
                        type="button"
                        onClick={toggleDrawMode}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          drawMode
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-100'
                        }`}
                        style={drawMode ? undefined : { color: 'var(--foreground)' }}
                      >
                        {drawMode ? t('scrapeDrawing') : t('scrapeDrawOnMap')}
                      </button>
                    </div>
                    <input
                      ref={searchRef}
                      placeholder={t('scrapeSearchCity')}
                      className="w-full border rounded px-3 py-2 text-sm mb-2"
                      style={{
                        background: 'var(--muted)',
                        color: 'var(--foreground)',
                        display: drawMode ? 'none' : undefined,
                      }}
                    />
                    <div
                      ref={mapDivRef}
                      className="w-full h-64 rounded border"
                      style={{
                        background: 'var(--muted)',
                        cursor: drawMode ? 'crosshair' : undefined,
                      }}
                    />

                    {drawMode && !coordsSw && (
                      <p className="text-xs mt-1 text-blue-600">
                        {isDrawing ? t('scrapeDragToSelect') : t('scrapeClickAndDrag')}
                      </p>
                    )}

                    {center && !drawMode ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{t('scrapeRadius')}</label>
                          <span className="text-sm font-semibold text-blue-600">{radiusKm} km</span>
                        </div>
                        <input
                          type="range" min={1} max={100} value={radiusKm}
                          onChange={(e) => handleRadiusChange(Number(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                        <div className="rounded p-2 flex gap-6 text-xs font-mono" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                          <span>SW {coordsSw}</span>
                          <span>NE {coordsNe}</span>
                        </div>
                      </div>
                    ) : coordsSw && coordsNe ? (
                      <div className="mt-3">
                        <div className="rounded p-2 flex gap-6 text-xs font-mono" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                          <span>SW {coordsSw}</span>
                          <span>NE {coordsNe}</span>
                        </div>
                      </div>
                    ) : !drawMode ? (
                      <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                        {t('scrapeNoAreaHint')}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    {t('scrapeAddApiKey')} <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> {t('scrapeApiKeyHint')}
                  </p>
                )}

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? t('scrapeRunning') : t('scrapeRun')}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded text-sm border"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
