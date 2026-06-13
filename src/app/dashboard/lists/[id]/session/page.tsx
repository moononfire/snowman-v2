'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Phone, ChevronLeft, ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react'
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

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const [list, setList] = useState<ListData | null>(null)
  const [index, setIndex] = useState(0)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<CallStatus | null>(null)
  const [followUpDate, setFollowUpDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchList = useCallback(async () => {
    const res = await fetch(`/api/lists/${id}`)
    const data: ListData = await res.json()
    setList(data)
    const firstUncalled = data.listContacts.findIndex((lc) => lc.status === 'NOT_CALLED')
    setIndex(firstUncalled >= 0 ? firstUncalled : 0)
  }, [id])

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

  const total = list.listContacts.length
  const called = list.listContacts.filter((lc) => lc.status !== 'NOT_CALLED').length
  const allDone = called === total

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
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <span>{index + 1} z {total}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                disabled={index === total - 1}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-8 py-8 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-blue-200 text-sm font-medium mb-1">
                    {current.contact.company ?? ''}
                    {current.contact.position ? ` · ${current.contact.position}` : ''}
                  </p>
                  <h2 className="text-3xl font-bold">
                    {current.contact.firstName} {current.contact.lastName}
                  </h2>
                </div>
                <a
                  href={`tel:${current.contact.phone.replace(/\s/g, '')}`}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors text-white rounded-xl px-4 py-2.5"
                >
                  <Phone className="h-5 w-5" />
                  <span className="font-mono text-lg font-semibold">{current.contact.phone}</span>
                </a>
              </div>
              {current.contact.email && (
                <p className="text-blue-200 text-sm mt-2">{current.contact.email}</p>
              )}
            </div>

            {current.contact.preCallNote && (
              <div className="px-8 py-3 bg-amber-500/10 border-b border-amber-500/20">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Notatka przed rozmową</p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{current.contact.preCallNote}</p>
              </div>
            )}

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

          <div className="mt-4 grid grid-cols-7 gap-1">
            {list.listContacts.map((lc, i) => (
              <button
                key={lc.id}
                onClick={() => setIndex(i)}
                title={`${lc.contact.firstName} ${lc.contact.lastName ?? ''}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'bg-blue-600' :
                  lc.status === 'NOT_CALLED' ? 'bg-muted-foreground/20' :
                  lc.status === 'INTERESTED' ? 'bg-green-400' :
                  lc.status === 'CALLBACK' ? 'bg-blue-300' :
                  lc.status === 'NO_ANSWER' ? 'bg-yellow-300' :
                  'bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
