'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Phone, ChevronLeft, ChevronRight, CheckCircle, ArrowLeft, MapPin, Star, Globe, Clock, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CALL_STATUS_LABELS, CALL_STATUS_COLORS, CALL_STATUS_ORDER, type CallStatus } from '@/lib/callTypes'

type Contact = {
  id: string
  firstName: string
  lastName: string | null
  phone: string
  company: string | null
  position: string | null
  preCallNote: string | null
  email: string | null
  website: string | null
  city: string | null
  address: string | null
  googlePlaceId: string | null
  googleMapsUrl: string | null
  latitude: number | null
  longitude: number | null
  rating: number | null
  reviewCount: number | null
  businessStatus: string | null
  openingHours: string[] | null
  tags: string | null
  source: string
}

type ListContact = {
  id: string
  contactId: string
  status: CallStatus
  notes: string | null
  followUpAt: string | null
  contact: Contact
}

type ListData = {
  id: string
  name: string
  listContacts: ListContact[]
}

const BUSINESS_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPERATIONAL: { label: 'Otwarte', color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
  CLOSED_TEMPORARILY: { label: 'Tymczasowo zamknięte', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400' },
  CLOSED_PERMANENTLY: { label: 'Zamknięte na stałe', color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
}

function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number | null }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.3
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalf && (
          <div className="relative">
            <Star className="h-4 w-4 text-muted-foreground/30" />
            <div className="absolute inset-0 overflow-hidden w-[50%]">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground/30" />
        ))}
      </div>
      <span className="font-semibold text-sm text-foreground">{rating.toFixed(1)}</span>
      {reviewCount != null && (
        <span className="text-sm text-muted-foreground">({reviewCount} opinii)</span>
      )}
    </div>
  )
}

function GoogleMapWithCard({ contact }: { contact: Contact }) {
  const [copied, setCopied] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const c = contact
  const q = c.googlePlaceId ? `place_id:${c.googlePlaceId}` : encodeURIComponent(`${c.company || c.firstName} ${c.address || c.city || ''}`)
  const mapsLink = c.googleMapsUrl || (c.googlePlaceId ? `https://www.google.com/maps/place/?q=place_id:${c.googlePlaceId}` : `https://www.google.com/maps/search/${encodeURIComponent(`${c.company || c.firstName} ${c.address || c.city || ''}`)}`)

  return (
    <div className="relative">
      {/* Map */}
      {apiKey && (
        <iframe
          className="w-full h-[250px]"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${q}`}
        />
      )}

      {/* Business card overlay */}
      <div className="bg-card border-t border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground truncate">{c.company || c.firstName}</h3>

            {c.rating != null && (
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-sm text-foreground">{c.rating.toFixed(1)}</span>
                <StarRating rating={c.rating} reviewCount={null} />
                {c.reviewCount != null && (
                  <span className="text-sm text-muted-foreground">({c.reviewCount.toLocaleString('pl-PL')})</span>
                )}
              </div>
            )}

            {c.tags && (
              <p className="text-sm text-muted-foreground mt-1">
                {c.tags.split(',').map(t => t.trim().replace(/_/g, ' ')).join(' · ')}
              </p>
            )}

            {c.businessStatus && c.businessStatus !== 'OPERATIONAL' && (
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1.5 ${BUSINESS_STATUS_LABELS[c.businessStatus]?.color || ''}`}>
                {BUSINESS_STATUS_LABELS[c.businessStatus]?.label || c.businessStatus}
              </span>
            )}
          </div>

          {c.googleMapsUrl && (
            <a
              href={c.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Google Maps
            </a>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          {c.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-foreground">{c.address}</span>
            </div>
          )}

          {c.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <button
                onClick={() => { navigator.clipboard.writeText(c.phone.replace(/\s/g, '')); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                className="text-foreground hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                title="Kopiuj numer"
              >
                {copied ? 'Skopiowano!' : c.phone}
              </button>
            </div>
          )}

          {c.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline truncate">
                {c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </a>
            </div>
          )}

          {c.openingHours && c.openingHours.length > 0 && (
            <OpeningHoursInline hours={c.openingHours} />
          )}
        </div>
      </div>
    </div>
  )
}

function parseTimeToMinutes(timeStr: string): number | null {
  const cleaned = timeStr.trim().toLowerCase()
  if (cleaned.includes('closed')) return null

  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const ampm = match[3]?.toLowerCase()

  if (ampm === 'pm' && hours !== 12) hours += 12
  if (ampm === 'am' && hours === 12) hours = 0

  return hours * 60 + minutes
}

function isOpenNow(hours: string[]): { isOpen: boolean; label: string } | null {
  const now = new Date()
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const todayLine = hours.find(h => h.toLowerCase().startsWith(dayName.toLowerCase()))
  if (!todayLine) return null

  const colonIdx = todayLine.indexOf(':')
  if (colonIdx === -1) return null
  const afterColon = todayLine.slice(colonIdx + 1).trim()

  if (afterColon.toLowerCase().includes('closed')) {
    return { isOpen: false, label: 'Zamknięte' }
  }
  if (afterColon.toLowerCase().includes('open 24 hours')) {
    return { isOpen: true, label: 'Otwarte 24h' }
  }

  const rangeParts = afterColon.split('–').map(s => s.trim())
  if (rangeParts.length !== 2) return null

  const openTime = parseTimeToMinutes(rangeParts[0])
  const closeTime = parseTimeToMinutes(rangeParts[1])
  if (openTime === null || closeTime === null) return null

  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  if (closeTime > openTime) {
    const isOpen = nowMinutes >= openTime && nowMinutes < closeTime
    return { isOpen, label: isOpen ? 'Otwarte' : 'Zamknięte' }
  } else {
    const isOpen = nowMinutes >= openTime || nowMinutes < closeTime
    return { isOpen, label: isOpen ? 'Otwarte' : 'Zamknięte' }
  }
}

function OpeningHoursInline({ hours }: { hours: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayLine = hours.find(h => h.toLowerCase().startsWith(today.toLowerCase())) || hours[0]
  const openStatus = isOpenNow(hours)

  return (
    <div className="text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Clock className="h-4 w-4 shrink-0" />
        {openStatus && (
          <span className={`font-semibold ${openStatus.isOpen ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {openStatus.label}
          </span>
        )}
        <span className="text-muted-foreground">·</span>
        <span>{todayLine}</span>
        <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="ml-6 mt-1 space-y-0.5">
          {hours.map((line, i) => (
            <p key={i} className={`text-sm ${line.toLowerCase().startsWith(today.toLowerCase()) ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [list, setList] = useState<ListData | null>(null)
  const [index, setIndex] = useState(0)
  const [initialIndexApplied, setInitialIndexApplied] = useState(false)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<CallStatus | null>(null)
  const [followUpDate, setFollowUpDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)

  const fetchList = useCallback(async () => {
    const res = await fetch(`/api/lists/${id}`)
    const data: ListData = await res.json()
    setList(data)
    if (!initialIndexApplied) {
      const paramIndex = searchParams.get('index')
      if (paramIndex != null) {
        const parsed = parseInt(paramIndex, 10)
        if (!isNaN(parsed) && parsed >= 0 && parsed < data.listContacts.length) {
          setIndex(parsed)
          setInitialIndexApplied(true)
          return
        }
      }
      const firstUncalled = data.listContacts.findIndex((lc) => lc.status === 'NOT_CALLED')
      setIndex(firstUncalled >= 0 ? firstUncalled : 0)
      setInitialIndexApplied(true)
    }
  }, [id, initialIndexApplied, searchParams])

  useEffect(() => { fetchList() }, [fetchList])

  const current = list?.listContacts[index]

  useEffect(() => {
    if (current) {
      setNotes(current.notes ?? '')
      setStatus(current.status !== 'NOT_CALLED' ? current.status : null)
      setFollowUpDate(current.followUpAt ? current.followUpAt.slice(0, 10) : '')
      setSaved(false)
    }
  }, [current?.contactId])

  async function save(nextIndex?: number) {
    if (!current || !status) return
    setSaving(true)
    await fetch(`/api/lists/${id}/contacts/${current.contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        notes,
        followUpAt: followUpDate || null,
        calledAt: new Date().toISOString(),
      }),
    })
    setSaving(false)
    setSaved(true)
    await fetchList()
    if (nextIndex !== undefined) {
      setTimeout(() => setIndex(nextIndex), 300)
    }
  }

  async function saveAndNext() {
    await save()
    const next = list ? list.listContacts.findIndex((lc, i) => i > index && lc.status === 'NOT_CALLED') : -1
    if (next >= 0) {
      setTimeout(() => setIndex(next), 300)
    }
  }

  if (!list) return <div className="p-8 text-muted-foreground">Ładowanie...</div>
  if (!current) return <div className="p-8 text-muted-foreground">Brak kontaktów na liście.</div>

  const total = list.listContacts.filter((lc) => lc.status !== 'NOT_RELEVANT').length
  const called = list.listContacts.filter((lc) => lc.status !== 'NOT_CALLED' && lc.status !== 'NOT_RELEVANT').length
  const allDone = called === total
  const c = current.contact
  const hasGoogleData = c.source === 'GOOGLE_SCRAPE' && (c.rating != null || c.googlePlaceId || c.latitude != null)
  const statusInfo = c.businessStatus ? BUSINESS_STATUS_LABELS[c.businessStatus] : null

  return (
    <div className="min-h-full bg-background">
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/lists/${id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="font-semibold text-foreground">{list.name}</p>
            <p className="text-xs text-muted-foreground">{called}/{total} zadzwoniono</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${total > 0 ? (called / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{Math.round(total > 0 ? (called / total) * 100 : 0)}%</span>
        </div>
      </div>

      {allDone ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Wszystko zrobione!</h2>
          <p className="text-muted-foreground mb-6">Przeszedłeś przez wszystkie {total} kontaktów na liście.</p>
          <Link href={`/dashboard/lists/${id}`}>
            <Button>Wróć do listy</Button>
          </Link>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 5))}
                disabled={index === 0}
                className="px-2 py-1.5 rounded hover:bg-muted disabled:opacity-30 text-xs font-medium"
                title="-5"
              >
                -5
              </button>
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1 mx-1">
                <input
                  type="number"
                  min={1}
                  max={total}
                  value={index + 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val >= 1 && val <= total) {
                      setIndex(val - 1)
                    }
                  }}
                  className="w-14 text-center px-1 py-1 border border-border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-muted-foreground">/ {total}</span>
              </div>
              <button
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                disabled={index === total - 1}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIndex((i) => Math.min(total - 1, i + 5))}
                disabled={index >= total - 1}
                className="px-2 py-1.5 rounded hover:bg-muted disabled:opacity-30 text-xs font-medium"
                title="+5"
              >
                +5
              </button>
            </div>
            <span className="text-xs text-muted-foreground">{called}/{total} zadzwoniono</span>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-8 py-8 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-blue-200 text-sm font-medium">
                      {c.company ?? ''}
                      {c.position ? ` · ${c.position}` : ''}
                    </p>
                    {statusInfo && c.businessStatus !== 'OPERATIONAL' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold">
                    {c.firstName} {c.lastName}
                  </h2>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(c.phone.replace(/\s/g, '')); setCopiedPhone(true); setTimeout(() => setCopiedPhone(false), 1500) }}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors text-white rounded-xl px-4 py-2.5 cursor-pointer"
                  title="Kopiuj numer"
                >
                  {copiedPhone ? <CheckCircle className="h-5 w-5 shrink-0" /> : <Phone className="h-5 w-5 shrink-0" />}
                  <span className="font-mono text-lg font-semibold">{copiedPhone ? 'Skopiowano!' : c.phone}</span>
                </button>
              </div>
              {c.email && (
                <p className="text-blue-200 text-sm mt-2">{c.email}</p>
              )}
            </div>

            {/* Google Map + Business Card */}
            {(c.googlePlaceId || c.company || c.address) && (
              <div className="border-b border-border">
                <GoogleMapWithCard contact={c} />
              </div>
            )}

            {/* Call controls */}
            <div className="px-8 py-6 space-y-5">
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Wynik rozmowy</p>
                <div className="flex flex-wrap gap-2">
                  {CALL_STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        status === s
                          ? `${CALL_STATUS_COLORS[s]} border-current ring-2 ring-offset-1 ring-current`
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      }`}
                    >
                      {CALL_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Notatka po rozmowie</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Co ustaliliście, jak zareagował, o czym rozmawialiście..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {status === 'CALLBACK' && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Termin oddzwonienia</p>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Zapisano
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => save()} disabled={!status || saving}>
                  {saving ? 'Zapisywanie...' : 'Zapisz'}
                </Button>
                <Button onClick={saveAndNext} disabled={!status || saving}>
                  Zapisz i następny
                </Button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
