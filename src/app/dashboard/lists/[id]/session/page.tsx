'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Phone, ChevronLeft, ChevronRight, CheckCircle, ArrowLeft, MapPin, Star, Globe, Clock, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CALL_STATUS_LABEL_KEYS, CALL_STATUS_COLORS, CALL_STATUS_ORDER, type CallStatus } from '@/lib/callTypes'
import { useT, useDateLocale } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n'

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

const BUSINESS_STATUS_COLORS: Record<string, string> = {
  OPERATIONAL: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  CLOSED_TEMPORARILY: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
  CLOSED_PERMANENTLY: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
}

const BUSINESS_STATUS_LABEL_KEYS: Record<string, TranslationKey> = {
  OPERATIONAL: 'businessOpen',
  CLOSED_TEMPORARILY: 'businessClosedTemp',
  CLOSED_PERMANENTLY: 'businessClosedPerm',
}

function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number | null }) {
  const t = useT()
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
        <span className="text-sm text-muted-foreground">({reviewCount} {t('reviews')})</span>
      )}
    </div>
  )
}

function PlacePhotos({ placeId }: { placeId: string }) {
  const [selected, setSelected] = useState(0)
  const [loaded, setLoaded] = useState<boolean[]>([])

  const visibleCount = loaded.filter(Boolean).length

  return (
    <div>
      {/* Main photo */}
      <img
        src={`/api/places/${placeId}/photo?index=${selected}`}
        alt=""
        className="w-full h-[250px] object-cover"
      />
      {/* Thumbnails */}
      <div className="flex gap-1 p-2 overflow-x-auto bg-black/5 dark:bg-white/5">
        {Array.from({ length: 10 }).map((_, i) => (
          <img
            key={`${placeId}-${i}`}
            src={`/api/places/${placeId}/photo?index=${i}`}
            alt=""
            className={`h-14 w-20 object-cover rounded cursor-pointer shrink-0 transition-all ${
              selected === i ? 'ring-2 ring-blue-500 opacity-100' : 'opacity-60 hover:opacity-100'
            } ${loaded[i] === false ? 'hidden' : ''}`}
            loading="lazy"
            onLoad={() => setLoaded(prev => { const n = [...prev]; n[i] = true; return n })}
            onError={() => setLoaded(prev => { const n = [...prev]; n[i] = false; return n })}
            onClick={() => setSelected(i)}
          />
        ))}
      </div>
    </div>
  )
}

function GoogleMapWithCard({ contact }: { contact: Contact }) {
  const t = useT()
  const dateLocale = useDateLocale()
  const [copied, setCopied] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const c = contact
  const q = c.googlePlaceId ? `place_id:${c.googlePlaceId}` : encodeURIComponent(`${c.company || c.firstName} ${c.address || c.city || ''}`)
  const mapsLink = c.googleMapsUrl || (c.googlePlaceId ? `https://www.google.com/maps/place/?q=place_id:${c.googlePlaceId}` : `https://www.google.com/maps/search/${encodeURIComponent(`${c.company || c.firstName} ${c.address || c.city || ''}`)}`)

  return (
    <div className="relative">
      {/* Place photos */}
      {c.googlePlaceId && <PlacePhotos placeId={c.googlePlaceId} />}

      {/* Map */}
      {apiKey && (
        <iframe
          className="w-full h-[200px]"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${q}&zoom=8`}
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
                  <span className="text-sm text-muted-foreground">({c.reviewCount.toLocaleString(dateLocale)})</span>
                )}
              </div>
            )}

            {c.tags && (
              <p className="text-sm text-muted-foreground mt-1">
                {c.tags.split(',').map(tg => tg.trim().replace(/_/g, ' ')).join(' · ')}
              </p>
            )}

            {c.businessStatus && c.businessStatus !== 'OPERATIONAL' && (
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1.5 ${BUSINESS_STATUS_COLORS[c.businessStatus] || ''}`}>
                {BUSINESS_STATUS_LABEL_KEYS[c.businessStatus] ? t(BUSINESS_STATUS_LABEL_KEYS[c.businessStatus]) : c.businessStatus}
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
                title={t('sessionCopyNumber')}
              >
                {copied ? t('copied') : c.phone}
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

function useIsOpenNow(hours: string[]): { isOpen: boolean; labelKey: TranslationKey } | null {
  const now = new Date()
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const todayLine = hours.find(h => h.toLowerCase().startsWith(dayName.toLowerCase()))
  if (!todayLine) return null

  const colonIdx = todayLine.indexOf(':')
  if (colonIdx === -1) return null
  const afterColon = todayLine.slice(colonIdx + 1).trim()

  if (afterColon.toLowerCase().includes('closed')) {
    return { isOpen: false, labelKey: 'businessClosedNow' }
  }
  if (afterColon.toLowerCase().includes('open 24 hours')) {
    return { isOpen: true, labelKey: 'businessOpen24h' }
  }

  const rangeParts = afterColon.split('–').map(s => s.trim())
  if (rangeParts.length !== 2) return null

  const openTime = parseTimeToMinutes(rangeParts[0])
  const closeTime = parseTimeToMinutes(rangeParts[1])
  if (openTime === null || closeTime === null) return null

  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  if (closeTime > openTime) {
    const isOpen = nowMinutes >= openTime && nowMinutes < closeTime
    return { isOpen, labelKey: isOpen ? 'businessOpenNow' : 'businessClosedNow' }
  } else {
    const isOpen = nowMinutes >= openTime || nowMinutes < closeTime
    return { isOpen, labelKey: isOpen ? 'businessOpenNow' : 'businessClosedNow' }
  }
}

function OpeningHoursInline({ hours }: { hours: string[] }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayLine = hours.find(h => h.toLowerCase().startsWith(today.toLowerCase())) || hours[0]
  const openStatus = useIsOpenNow(hours)

  return (
    <div className="text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Clock className="h-4 w-4 shrink-0" />
        {openStatus && (
          <span className={`font-semibold ${openStatus.isOpen ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {t(openStatus.labelKey)}
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
  const t = useT()
  const dateLocale = useDateLocale()
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [list, setList] = useState<ListData | null>(null)
  const [index, setIndex] = useState(0)
  const [initialIndexApplied, setInitialIndexApplied] = useState(false)
  const [notes, setNotes] = useState('')
  const [reasonTag, setReasonTag] = useState<string | null>(null)
  const [status, setStatus] = useState<CallStatus | null>(null)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpTime, setFollowUpTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [scheduledToList, setScheduledToList] = useState<string | null>(null)

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
    return data
  }, [id, initialIndexApplied, searchParams])

  useEffect(() => { fetchList() }, [fetchList])

  const current = list?.listContacts[index]

  useEffect(() => {
    if (current) {
      const rawNotes = current.notes ?? ''
      const tagMatch = rawNotes.match(/^\[(CALLBACK|NO_ANSWER|VOICEMAIL)\]$/)
      if (tagMatch) {
        setReasonTag(tagMatch[1])
        setNotes('')
      } else {
        setReasonTag(null)
        setNotes(rawNotes)
      }
      setStatus(current.status !== 'NOT_CALLED' ? current.status : null)
      if (current.followUpAt) {
        const d = new Date(current.followUpAt)
        setFollowUpDate(d.toLocaleDateString('en-CA'))
        setFollowUpTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
      } else {
        setFollowUpDate('')
        setFollowUpTime('')
      }
      setSaved(false)
      setScheduledToList(null)
    }
  }, [current?.contactId])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight' && list) setIndex(i => Math.min(list.listContacts.length - 1, i + 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [list])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentRef = useRef(current)
  currentRef.current = current

  const persist = useCallback(async (fields: { status?: CallStatus; notes?: string; followUpAt?: string | null }) => {
    const c = currentRef.current
    if (!c) return
    setSaving(true)
    await fetch(`/api/lists/${id}/contacts/${c.contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...fields,
        calledAt: fields.status ? new Date().toISOString() : undefined,
      }),
    })
    setSaving(false)
    setSaved(true)
    fetchList()
  }, [id, fetchList])

  function getFollowUpISO(date: string, time: string): string | null {
    if (!date) return null
    return new Date(`${date}T${time || '00:00'}:00`).toISOString()
  }

  function getTomorrow(): string {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-CA')
  }

  function notesForPersist(value: string, tag: string | null): string {
    if (tag && value === '') return `[${tag}]`
    return value
  }

  async function moveToTomorrow() {
    if (!current) return
    const contactId = current.contactId
    const targetDate = getTomorrow()
    const listName = `${targetDate} – Callback`
    setScheduling(true)
    try {
      await fetch('/api/lists/schedule-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, targetDate, targetTime: null, listName, reason: status ?? 'NO_ANSWER' }),
      })
      await fetch(`/api/lists/${id}/contacts/${contactId}`, { method: 'DELETE' })
      const newData = await fetchList()
      if (newData) {
        setIndex(i => Math.min(i, Math.max(0, newData.listContacts.length - 1)))
      }
    } finally {
      setScheduling(false)
    }
  }

  function handleStatusClick(s: CallStatus) {
    setStatus(s)
    persist({ status: s, notes: notesForPersist(notes, reasonTag), followUpAt: getFollowUpISO(followUpDate, followUpTime) })
  }

  function handleNotesChange(value: string) {
    setNotes(value)
    if (value && reasonTag) setReasonTag(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persist({ notes: notesForPersist(value, value ? null : reasonTag), ...(status ? { status } : {}), followUpAt: getFollowUpISO(followUpDate, followUpTime) })
    }, 800)
  }

  function handleFollowUpChange(value: string) {
    setFollowUpDate(value)
    if (status) persist({ status, notes: notesForPersist(notes, reasonTag), followUpAt: getFollowUpISO(value, followUpTime) })
  }

  function handleFollowUpTimeChange(value: string) {
    setFollowUpTime(value)
    if (status && followUpDate) persist({ status, notes: notesForPersist(notes, reasonTag), followUpAt: getFollowUpISO(followUpDate, value) })
  }

  async function handleScheduleCallback() {
    if (!current || !followUpDate) return
    const targetDate = followUpDate
    const listName = `${targetDate} – Callback`
    const res = await fetch('/api/lists/schedule-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: current.contactId, targetDate, targetTime: followUpTime || null, listName, reason: 'CALLBACK' }),
    })
    const data = await res.json()
    setScheduledToList(data.listName)
    setTimeout(() => setScheduledToList(null), 4000)
  }

  if (!list) return <div className="p-8 text-muted-foreground">{t('loading')}</div>
  if (!current) return <div className="p-8 text-muted-foreground">{t('listNoContacts')}</div>

  const total = list.listContacts.filter((lc) => lc.status !== 'NOT_RELEVANT').length
  const called = list.listContacts.filter((lc) => lc.status !== 'NOT_CALLED' && lc.status !== 'NOT_RELEVANT').length
  const allDone = called === total
  const c = current.contact
  const hasGoogleData = c.source === 'GOOGLE_SCRAPE' && (c.rating != null || c.googlePlaceId || c.latitude != null)
  const statusInfo = c.businessStatus ? { label: BUSINESS_STATUS_LABEL_KEYS[c.businessStatus] ? t(BUSINESS_STATUS_LABEL_KEYS[c.businessStatus]) : c.businessStatus, color: BUSINESS_STATUS_COLORS[c.businessStatus] || '' } : null

  return (
    <div className="min-h-full bg-background">
      <div className="bg-card border-b border-border px-3 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/lists/${id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="font-semibold text-foreground">{list.name}</p>
            <p className="text-xs text-muted-foreground">{called}/{total} {t('sessionCalled')}</p>
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
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('sessionAllDone')}</h2>
          <p className="text-muted-foreground mb-6">{t('sessionAllDoneDescription')} {total} {t('sessionAllDoneContacts')}</p>
          <Link href={`/dashboard/lists/${id}`}>
            <Button>{t('sessionBackToList')}</Button>
          </Link>
        </div>
      ) : (
        <div className="mx-auto px-3 md:px-6 py-4 md:py-6" style={{ maxWidth: '1920px' }}>
          {/* Navigation */}
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
                className="p-2.5 md:p-1.5 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" />
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
                className="p-2.5 md:p-1.5 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5 md:h-4 md:w-4" />
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
            <span className="text-xs text-muted-foreground">{called}/{total} {t('sessionCalled')}</span>
          </div>

          <div className="flex flex-col md:flex-row gap-5 items-start">
            {/* Left: contact info + call controls */}
            <div className="flex-1 min-w-0 w-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 md:px-8 py-5 md:py-7 text-white">
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
                    {reasonTag && (
                      <span className={`inline-flex items-center mt-2 text-xs px-2.5 py-1 rounded-full font-semibold ${CALL_STATUS_COLORS[reasonTag as CallStatus] ?? ''}`}>
                        {t(CALL_STATUS_LABEL_KEYS[reasonTag as CallStatus])}
                      </span>
                    )}
                  </div>
                  <a
                    href={`tel:${c.phone.replace(/\s/g, '')}`}
                    onClick={(e) => {
                      if (window.innerWidth >= 768) {
                        e.preventDefault()
                        navigator.clipboard.writeText(c.phone.replace(/\s/g, ''))
                        setCopiedPhone(true)
                        setTimeout(() => setCopiedPhone(false), 1500)
                      }
                    }}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors text-white rounded-xl px-4 py-2.5 cursor-pointer"
                    title={t('sessionCopyNumber')}
                  >
                    {copiedPhone ? <CheckCircle className="h-5 w-5 shrink-0" /> : <Phone className="h-5 w-5 shrink-0" />}
                    <span className="font-mono text-lg font-semibold whitespace-nowrap">{copiedPhone ? t('copied') : c.phone}</span>
                  </a>
                </div>
                {c.email && (
                  <p className="text-blue-200 text-sm mt-2">{c.email}</p>
                )}
              </div>

              {/* Call controls */}
              <div className="px-5 md:px-8 py-5 md:py-6 space-y-5">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">{t('sessionCallResult')}</p>
                  <div className="flex flex-wrap gap-2">
                    {CALL_STATUS_ORDER.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusClick(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          status === s
                            ? `${CALL_STATUS_COLORS[s]} border-current ring-2 ring-offset-1 ring-current`
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                        }`}
                      >
                        {t(CALL_STATUS_LABEL_KEYS[s])}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">{t('sessionPostCallNote')}</p>
                  <Textarea
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder={t('sessionNotePlaceholder')}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {(status === 'NO_ANSWER' || status === 'VOICEMAIL') && (
                  <Button
                    onClick={moveToTomorrow}
                    disabled={scheduling}
                    size="sm"
                    variant="outline"
                  >
                    {t('sessionMoveToTomorrow')}
                  </Button>
                )}

                {status === 'CALLBACK' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3 items-end">
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">{t('sessionCallbackDate')}</p>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => handleFollowUpChange(e.target.value)}
                          className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min={new Date().toISOString().slice(0, 10)}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">{t('sessionCallbackTime')}</p>
                        <input
                          type="time"
                          value={followUpTime}
                          onChange={(e) => handleFollowUpTimeChange(e.target.value)}
                          className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <Button
                        onClick={handleScheduleCallback}
                        disabled={!followUpDate || scheduling}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {t('sessionScheduleCallback')}
                      </Button>
                    </div>
                    {scheduledToList && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {t('sessionAddedToList')} <span className="font-medium">{scheduledToList}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 md:px-8 py-3 border-t border-border flex items-center justify-end">
                {saving && (
                  <span className="text-xs text-muted-foreground">{t('saving')}</span>
                )}
                {saved && !saving && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t('saved')}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Google photo + map + business info */}
            {(c.googlePlaceId || c.company || c.address) && (
              <div className="w-full md:w-[560px] md:shrink-0 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <GoogleMapWithCard contact={c} />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
