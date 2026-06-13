'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Play, UserPlus, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddContactsModal } from '@/components/add-contacts-modal'
import { CALL_STATUS_LABELS, CALL_STATUS_COLORS } from '@/lib/callTypes'

type Contact = {
  id: string
  firstName: string
  lastName: string | null
  phone: string
  company: string | null
}

type ListContact = {
  id: string
  contactId: string
  status: string
  notes: string | null
  followUpAt: string | null
  calledAt: string | null
  contact: Contact
}

type ListData = {
  id: string
  name: string
  description: string | null
  listContacts: ListContact[]
}

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [list, setList] = useState<ListData | null>(null)
  const [showAddContacts, setShowAddContacts] = useState(false)

  const fetchList = useCallback(async () => {
    const res = await fetch(`/api/lists/${id}`)
    setList(await res.json())
  }, [id])

  useEffect(() => { fetchList() }, [fetchList])

  async function removeContact(contactId: string) {
    await fetch(`/api/lists/${id}/contacts/${contactId}`, { method: 'DELETE' })
    fetchList()
  }

  if (!list) return <div className="p-8 text-muted-foreground">Ładowanie...</div>

  const total = list.listContacts.length
  const called = list.listContacts.filter((lc) => lc.status !== 'NOT_CALLED').length
  const nextUncalled = list.listContacts.find((lc) => lc.status === 'NOT_CALLED')
  const existingContactIds = list.listContacts.map((lc) => lc.contactId)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/lists" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />
        Listy
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{list.name}</h1>
          {list.description && <p className="text-muted-foreground mt-1">{list.description}</p>}
          <p className="text-sm text-muted-foreground mt-1">{called}/{total} zadzwoniono</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddContacts(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Dodaj kontakty
          </Button>
          {total > 0 && (
            <Link href={`/dashboard/lists/${id}/session`}>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                {nextUncalled ? 'Zacznij/wznów sesję' : 'Przeglądaj sesję'}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kontakt</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefon</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notatka</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.listContacts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Brak kontaktów. Kliknij &quot;Dodaj kontakty&quot;.
                </td>
              </tr>
            )}
            {list.listContacts.map((lc, i) => (
              <tr key={lc.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {lc.contact.firstName} {lc.contact.lastName}
                  {lc.contact.company && <span className="ml-1 text-muted-foreground font-normal text-xs">· {lc.contact.company}</span>}
                </td>
                <td className="px-4 py-3 font-mono text-foreground">{lc.contact.phone}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CALL_STATUS_COLORS[lc.status as keyof typeof CALL_STATUS_COLORS]}`}>
                    {CALL_STATUS_LABELS[lc.status as keyof typeof CALL_STATUS_LABELS]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{lc.notes ?? '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => removeContact(lc.contactId)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddContacts && (
        <AddContactsModal
          listId={id}
          existingContactIds={existingContactIds}
          onClose={() => setShowAddContacts(false)}
          onAdded={() => { setShowAddContacts(false); fetchList() }}
        />
      )}
    </div>
  )
}
