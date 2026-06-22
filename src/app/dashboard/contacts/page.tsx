'use client'

import { useState } from 'react'
import { UserPlus, Upload, ListPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ContactForm } from '@/components/contact-form'
import { ImportModal } from '@/components/import-modal'
import { ContactsBrowser, Contact } from '@/components/contacts-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import NewGoogleScrapeButton from '@/app/dashboard/runs/NewGoogleScrapeButton'

export default function ContactsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [showCreateList, setShowCreateList] = useState(false)
  const [listName, setListName] = useState('')
  const [listDesc, setListDesc] = useState('')
  const [creatingList, setCreatingList] = useState(false)

  async function deleteContact(id: string) {
    if (!confirm('Na pewno usunąć kontakt?')) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setRefreshKey((k) => k + 1)
  }

  async function createListFromSelected() {
    if (!listName || selected.size === 0) return
    setCreatingList(true)
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: listName, description: listDesc || undefined }),
    })
    const list = await res.json()
    await fetch(`/api/lists/${list.id}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactIds: [...selected] }),
    })
    setCreatingList(false)
    router.push(`/dashboard/lists/${list.id}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Kontakty</h1>
        <div className="flex gap-2">
          <NewGoogleScrapeButton />
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importuj CSV
          </Button>
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Dodaj kontakt
          </Button>
        </div>
      </div>

      <ContactsBrowser
        selectable
        selected={selected}
        onSelectionChange={setSelected}
        refreshKey={refreshKey}
        onEdit={(c) => { setEditing(c); setShowForm(true) }}
        onDelete={deleteContact}
      />

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 z-40">
          <span className="text-sm font-medium text-foreground">
            {selected.size} zaznaczonych
          </span>
          <Button size="sm" onClick={() => setShowCreateList(true)}>
            <ListPlus className="h-3.5 w-3.5 mr-1.5" />
            Utwórz listę
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Wyczyść
          </button>
        </div>
      )}

      {showForm && (
        <ContactForm
          contact={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setRefreshKey((k) => k + 1) }}
        />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); setRefreshKey((k) => k + 1) }}
        />
      )}

      {showCreateList && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md border border-border p-6">
            <h2 className="font-semibold text-foreground mb-1">Utwórz listę</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {selected.size} zaznaczonych kontaktów zostanie dodanych do listy.
            </p>
            <div className="space-y-3">
              <div>
                <Label>Nazwa *</Label>
                <Input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="mt-1"
                  placeholder="np. Poniedziałek 9.06"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && createListFromSelected()}
                />
              </div>
              <div>
                <Label>Opis (opcjonalnie)</Label>
                <Input
                  value={listDesc}
                  onChange={(e) => setListDesc(e.target.value)}
                  className="mt-1"
                  placeholder="Notatka do listy..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="outline"
                  onClick={() => { setShowCreateList(false); setListName(''); setListDesc('') }}
                >
                  Anuluj
                </Button>
                <Button onClick={createListFromSelected} disabled={!listName || creatingList}>
                  {creatingList ? 'Tworzenie...' : 'Utwórz i przejdź'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
