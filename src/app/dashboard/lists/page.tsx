'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Play, ChevronRight, Trash2 } from 'lucide-react'
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

      <div className="space-y-3">
        {lists.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Brak list. Kliknij &quot;Nowa lista&quot;, żeby zacząć.</p>
          </div>
        )}
        {lists.map((list) => {
          const total = list.listContacts.length
          const called = list.listContacts.filter((lc) => lc.status !== 'NOT_CALLED').length
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
