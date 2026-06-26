'use client'

import { useState, useEffect } from 'react'
import { X, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/lib/i18n/context'

type Contact = {
  id: string
  firstName: string
  lastName: string | null
  phone: string
  company: string | null
}

export function AddContactsModal({
  listId,
  existingContactIds,
  onClose,
  onAdded,
}: {
  listId: string
  existingContactIds: string[]
  onClose: () => void
  onAdded: () => void
}) {
  const t = useT()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(search)}`)
      const all: Contact[] = await res.json()
      setContacts(all.filter((c) => !existingContactIds.includes(c.id)))
    }, 200)
    return () => clearTimeout(timer)
  }, [search, existingContactIds])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function add() {
    if (!selected.size) return
    setSaving(true)
    await fetch(`/api/lists/${listId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactIds: [...selected] }),
    })
    setSaving(false)
    onAdded()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg flex flex-col border border-border" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">{t('addContactsTitle')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 pt-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t('addContactsSearchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
          {contacts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {search ? t('addContactsNoResults') : t('addContactsAllOnList')}
            </p>
          )}
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                selected.has(c.id)
                  ? 'bg-blue-500/10 border border-blue-500/30'
                  : 'hover:bg-muted border border-transparent'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                selected.has(c.id) ? 'bg-blue-600 border-blue-600' : 'border-border'
              }`}>
                {selected.has(c.id) && <Check className="h-3 w-3 text-white" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{c.firstName} {c.lastName}</p>
                <p className="text-xs text-muted-foreground">{c.phone}{c.company ? ` · ${c.company}` : ''}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-t border-border shrink-0">
          <span className="text-sm text-muted-foreground">{selected.size} {t('contactsSelected')}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button onClick={add} disabled={!selected.size || saving}>
              {saving ? t('adding') : `${t('add')} ${selected.size}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
