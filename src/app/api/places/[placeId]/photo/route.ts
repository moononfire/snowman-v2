import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

const photoCache = new Map<string, { buffer: ArrayBuffer; contentType: string; ts: number }>()
const CACHE_TTL = 86400_000

function cleanCache() {
  const now = Date.now()
  for (const [key, val] of photoCache) {
    if (now - val.ts > CACHE_TTL) photoCache.delete(key)
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placeId: string }> },
) {
  const { placeId } = await params
  const idx = parseInt(req.nextUrl.searchParams.get('index') ?? '0', 10)
  if (!API_KEY || !placeId) {
    return NextResponse.json({ error: 'missing config' }, { status: 400 })
  }

  const cacheKey = `${placeId}_${idx}`
  const cached = photoCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new NextResponse(cached.buffer, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  }

  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${API_KEY}`
  const detailsRes = await fetch(detailsUrl, { next: { revalidate: 86400 } })
  const details = await detailsRes.json()

  const photos = details?.result?.photos
  if (!photos || !photos[idx]) {
    return NextResponse.json({ error: 'no photo' }, { status: 404 })
  }

  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${photos[idx].photo_reference}&key=${API_KEY}`
  const photoRes = await fetch(photoUrl)

  if (!photoRes.ok) {
    return NextResponse.json({ error: 'photo fetch failed' }, { status: 502 })
  }

  const contentType = photoRes.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await photoRes.arrayBuffer()

  photoCache.set(cacheKey, { buffer, contentType, ts: Date.now() })
  if (photoCache.size > 500) cleanCache()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
