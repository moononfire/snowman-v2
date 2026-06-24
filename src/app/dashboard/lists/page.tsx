'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Play, ChevronRight, Trash2, UserCheck, PhoneCall, PhoneMissed, UserX, MessageSquare, AlertTriangle, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ListItem = {
  id: string
  name: string
  description: string | null
  createdAt: string
  _count: { listContacts: number }
  listContacts: { status: string }[]
}

export default function ListsPage() {
  const [lists, setLists] = useState<ListItem[]>([])
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchLists() }, [])

  async function fetchLists() {
    const res = await fetch('/api/lists')
    setLists(await res.json())
  }

  async function createList() {
    if (!name) return
    setSaving(true)
    await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc }),
    })
    setSaving(false)
    setName(''); setDesc(''); setShowNew(false)
    fetchLists()
  }

  async function deleteList(id: string) {
    if (!confirm('Usunąć tę listę? Nie usuwa kontaktów.')) return
    await fetch(`/api/lists/${id}`, { method: 'DELETE' })
    setLists((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Listy do dzwonienia</h1>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nowa lista
        </Button>
      </div>

      {showNew && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-3">Nowa lista</h3>
          <div className="space-y-3">
            <div>
              <Label>Nazwa *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="np. Poniedziałek 9.06" autoFocus />
            </div>
            <div>
              <Label>Opis (opcjonalnie)</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1" placeholder="Notatka do listy..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNew(false)}>Anuluj</Button>
              <Button onClick={createList} disabled={!name || saving}>
                {saving ? 'Tworzenie...' : 'Utwórz'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KPI across all lists */}
      {lists.length > 0 && (() => {
        const allContacts = lists.flatMap(l => l.listContacts)
        const notRelevant = allContacts.filter(lc => lc.status === 'NOT_RELEVANT').length
        const total = allContacts.length - notRelevant
        const called = allContacts.filter(lc => lc.status !== 'NOT_CALLED' && lc.status !== 'NOT_RELEVANT').length
        const interested = allContacts.filter(lc => lc.status === 'INTERESTED').length
        const notInterested = allContacts.filter(lc => lc.status === 'NOT_INTERESTED').length
        const noAnswer = allContacts.filter(lc => lc.status === 'NO_ANSWER').length
        const callback = allContacts.filter(lc => lc.status === 'CALLBACK').length
        const voicemail = allContacts.filter(lc => lc.status === 'VOICEMAIL').length
        const wrongNumber = allContacts.filter(lc => lc.status === 'WRONG_NUMBER').length
        const reached = called - noAnswer - voicemail
        const contactRate = called > 0 ? Math.round((reached / called) * 100) : 0
        const positiveRate = reached > 0 ? Math.round((interested / reached) * 100) : 0

        const statuses = [
          { label: 'Zainteresowany', count: interested, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500', icon: <UserCheck className="h-4 w-4" /> },
          { label: 'Oddzwonienie', count: callback, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', icon: <PhoneCall className="h-4 w-4" /> },
          { label: 'Brak odpowiedzi', count: noAnswer, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500', icon: <PhoneMissed className="h-4 w-4" /> },
          { label: 'Poczta głosowa', count: voicemail, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500', icon: <MessageSquare className="h-4 w-4" /> },
          { label: 'Niezainteresowany', count: notInterested, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', icon: <UserX className="h-4 w-4" /> },
          { label: 'Nieodpowiedni', count: notRelevant, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500', icon: <Ban className="h-4 w-4" /> },
          { label: 'Zły numer', count: wrongNumber, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', icon: <AlertTriangle className="h-4 w-4" /> },
        ]

        return (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Obdzwoniono</p>
                <p className="text-2xl font-bold text-foreground">{called} <span className="text-sm font-normal text-muted-foreground">/ {total}</span></p>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${total > 0 ? (called / total) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Dodzwanialność</p>
                <p className="text-2xl font-bold text-foreground">{contactRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{reached} z {called} odebrało</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Konwersja</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{positiveRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{interested} zainteresowanych</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Do oddzwonienia</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{callback}</p>
                <p className="text-xs text-muted-foreground mt-1">kontaktów czeka</p>
              </div>
            </div>

            {called > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-0.5 h-3 rounded-full overflow-hidden">
                  {statuses.filter(s => s.count > 0).map(s => (
                    <div key={s.label} className={`h-full ${s.bg} transition-all`} style={{ width: `${(s.count / called) * 100}%` }} title={`${s.label}: ${s.count}`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
                  {statuses.map(s => (
                    <div key={s.label} className={`flex items-center gap-1.5 text-xs ${s.color}`}>
                      {s.icon}
                      <span>{s.label}</span>
                      <span className="font-semibold">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      <div className="space-y-3">
        {lists.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Brak list. Kliknij &quot;Nowa lista&quot;, żeby zacząć.</p>
          </div>
        )}
        {lists.map((list) => {
          const total = list.listContacts.filter((lc) => lc.status !== 'NOT_RELEVANT').length
          const called = list.listContacts.filter((lc) => lc.status !== 'NOT_CALLED' && lc.status !== 'NOT_RELEVANT').length
          const interested = list.listContacts.filter((lc) => lc.status === 'INTERESTED').length
          const pct = total > 0 ? Math.round((called / total) * 100) : 0

          return (
            <div key={list.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <Link href={`/dashboard/lists/${list.id}`} className="font-semibold text-foreground hover:text-blue-600 transition-colors">
                    {list.name}
                  </Link>
                  {list.description && <p className="text-sm text-muted-foreground mt-0.5">{list.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{total} kontaktów</span>
                    <span>{called} zadzwoniono</span>
                    {interested > 0 && <span className="text-green-600 font-medium">{interested} zainteresowanych</span>}
                  </div>
                  {total > 0 && (
                    <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden w-48">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {total > 0 && (
                    <Link href={`/dashboard/lists/${list.id}/session`}>
                      <Button size="sm">
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Start
                      </Button>
                    </Link>
                  )}
                  <Link href={`/dashboard/lists/${list.id}`}>
                    <button className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </Link>
                  <button onClick={() => deleteList(list.id)} className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
