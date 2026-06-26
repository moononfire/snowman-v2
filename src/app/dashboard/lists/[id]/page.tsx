'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Play, UserPlus, Trash2, ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown, LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddContactsModal } from '@/components/add-contacts-modal'
import { CALL_STATUS_LABEL_KEYS, CALL_STATUS_COLORS } from '@/lib/callTypes'
import { useT } from '@/lib/i18n/context'

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

type CampaignOption = {
  id: string
  name: string
  listId: string | null
}

type ListSortField = 'order' | 'name' | 'phone' | 'status' | 'notes'
type SortDir = 'asc' | 'desc'

export default function ListDetailPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [list, setList] = useState<ListData | null>(null)
  const [showAddContacts, setShowAddContacts] = useState(false)
  const [showCampaignPicker, setShowCampaignPicker] = useState(false)
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [sortField, setSortField] = useState<ListSortField>('order')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    const res = await fetch(`/api/lists/${id}`)
    setList(await res.json())
  }, [id])

  useEffect(() => { fetchList() }, [fetchList])

  const sortedListContacts = useMemo(() => {
    if (!list) return []
    if (sortField === 'order') {
      const items = [...list.listContacts]
      return sortDir === 'desc' ? items.reverse() : items
    }
    function getSortValue(lc: ListContact, field: Exclude<ListSortField, 'order'>): string {
      switch (field) {
        case 'name': return `${lc.contact.firstName} ${lc.contact.lastName ?? ''}`.toLowerCase()
        case 'phone': return lc.contact.phone
        case 'status': return lc.status
        case 'notes': return (lc.notes ?? '').toLowerCase()
      }
    }
    return [...list.listContacts].sort((a, b) => {
      const va = getSortValue(a, sortField)
      const vb = getSortValue(b, sortField)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [list, sortField, sortDir])

  async function loadCampaigns() {
    const res = await fetch('/api/campaigns')
    if (res.ok) {
      const data = await res.json()
      setCampaigns(data.map((c: CampaignOption) => ({ id: c.id, name: c.name, listId: c.listId })))
    }
  }

  async function attachToCampaign(campaignId: string) {
    await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId: id }),
    })
    setShowCampaignPicker(false)
  }

  async function removeContact(contactId: string) {
    if (!confirm(t('listRemoveConfirm'))) return
    await fetch(`/api/lists/${id}/contacts/${contactId}`, { method: 'DELETE' })
    fetchList()
  }

  if (!list) return <div className="p-8 text-muted-foreground">{t('loading')}</div>

  const total = list.listContacts.filter((lc) => lc.status !== 'NOT_RELEVANT').length
  const called = list.listContacts.filter((lc) => lc.status !== 'NOT_CALLED' && lc.status !== 'NOT_RELEVANT').length
  const nextUncalled = list.listContacts.find((lc) => lc.status === 'NOT_CALLED')
  const existingContactIds = list.listContacts.map((lc) => lc.contactId)

  function toggleSort(field: ListSortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }: { field: ListSortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  return (
    <div>
      <Link href="/dashboard/lists" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 shrink-0">
        <ArrowLeft className="h-4 w-4" />
        {t('listBackToLists')}
      </Link>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">{list.name}</h1>
          {list.description && <p className="text-muted-foreground text-sm mt-0.5">{list.description}</p>}
          <p className="text-sm text-muted-foreground mt-0.5">{called}/{total} {t('sessionCalled')}</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap shrink-0">
          <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={() => { loadCampaigns(); setShowCampaignPicker(true) }}>
            <LinkIcon className="h-4 w-4 mr-1.5" />
            {t('listAssignToCampaign')}
          </Button>
          <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={() => setShowAddContacts(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            {t('listAddContacts')}
          </Button>
          {total > 0 && (
            <Link href={`/dashboard/lists/${id}/session`} className="w-full md:w-auto">
              <Button size="sm" className="w-full md:w-auto">
                <Play className="h-4 w-4 mr-1.5" />
                {nextUncalled ? t('listStartSession') : t('listReviewSession')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ minHeight: 'calc(100svh - 200px)' }}>
        <div className="overflow-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              {([
                ['order', t('listColIndex')],
                ['name', t('listColContact')],
                ['phone', t('listColPhone')],
                ['status', t('listColStatus')],
                ['notes', t('listColNote')],
              ] as [ListSortField, string][]).map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => toggleSort(field)}
                  className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <SortIcon field={field} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.listContacts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t('listNoContacts')}
                </td>
              </tr>
            )}
            {sortedListContacts.map((lc, i) => {
              const originalIndex = list.listContacts.findIndex(o => o.id === lc.id)
              return (
              <tr
                key={lc.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/dashboard/lists/${id}/session?index=${originalIndex}`)}
              >
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {lc.contact.firstName} {lc.contact.lastName}
                  {lc.contact.company && <span className="ml-1 text-muted-foreground font-normal text-xs">· {lc.contact.company}</span>}
                </td>
                <td
                  className="px-4 py-3 font-mono whitespace-nowrap cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(lc.contact.phone.replace(/\s/g, ''))
                    setCopiedPhone(lc.id)
                    setTimeout(() => setCopiedPhone(null), 1500)
                  }}
                  title={t('listCopyNumber')}
                >
                  {copiedPhone === lc.id ? <span className="text-green-600 dark:text-green-400">{t('copied')}</span> : lc.contact.phone}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CALL_STATUS_COLORS[lc.status as keyof typeof CALL_STATUS_COLORS]}`}>
                    {t(CALL_STATUS_LABEL_KEYS[lc.status as keyof typeof CALL_STATUS_LABEL_KEYS])}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{lc.notes ?? '—'}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => removeContact(lc.contactId)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {showAddContacts && (
        <AddContactsModal
          listId={id}
          existingContactIds={existingContactIds}
          onClose={() => setShowAddContacts(false)}
          onAdded={() => { setShowAddContacts(false); fetchList() }}
        />
      )}

      {showCampaignPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCampaignPicker(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('listAssignTitle')}</h2>
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('listNoCampaigns')}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => attachToCampaign(c.id)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.listId === id && (
                      <span className="ml-2 text-xs text-green-600">{t('listAlreadyAssigned')}</span>
                    )}
                    {c.listId && c.listId !== id && (
                      <span className="ml-2 text-xs text-muted-foreground">{t('listHasOtherList')}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowCampaignPicker(false)}>{t('close')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
