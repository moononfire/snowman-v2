'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

type Campaign = {
  id: string
  name: string
  status: string
  script: string
  config: Record<string, unknown>
  listId: string | null
  lastRunId: string | null
  createdAt: string
}

type ListOption = {
  id: string
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300',
  scheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  done: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
}

type CampSortField = 'name' | 'status'
type SortDir = 'asc' | 'desc'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [lists, setLists] = useState<ListOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [selectedListId, setSelectedListId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sortField, setSortField] = useState<CampSortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  async function loadCampaigns() {
    const res = await fetch('/api/campaigns')
    if (res.ok) setCampaigns(await res.json())
  }

  async function loadLists() {
    const res = await fetch('/api/lists')
    if (res.ok) {
      const data = await res.json()
      setLists(data.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })))
    }
  }

  useEffect(() => { loadCampaigns(); loadLists() }, [])

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, script: 'send_campaign', config: {}, listId: selectedListId || null }),
    })
    setName('')
    setSelectedListId('')
    setShowForm(false)
    setSubmitting(false)
    loadCampaigns()
  }

  async function runCampaign(id: string) {
    await fetch(`/api/campaigns/${id}/run`, { method: 'POST' })
    loadCampaigns()
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Usunąć kampanię?')) return
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    loadCampaigns()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kampanie</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + Nowa kampania
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 mb-6" style={{ background: 'var(--card)' }}>
          <h2 className="font-semibold mb-3">Nowa kampania</h2>
          <form onSubmit={createCampaign} className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nazwa kampanii"
              required
              className="w-full border rounded px-3 py-2 text-sm"
              style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
            />
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
            >
              <option value="">— Lista kontaktów (opcjonalnie) —</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
                {submitting ? 'Tworzenie...' : 'Utwórz'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-sm border">
                Anuluj
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden" style={{ background: 'var(--card)' }}>
        <CampaignsTable
          campaigns={campaigns}
          lists={lists}
          sortField={sortField}
          sortDir={sortDir}
          onSort={(field: CampSortField) => {
            if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
            else { setSortField(field); setSortDir('asc') }
          }}
          onRun={runCampaign}
          onDelete={deleteCampaign}
        />
      </div>
    </div>
  )
}

function CampaignSortIcon({ field, sortField, sortDir }: { field: CampSortField; sortField: CampSortField; sortDir: SortDir }) {
  if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />
  return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
}

function CampaignsTable({ campaigns, lists, sortField, sortDir, onSort, onRun, onDelete }: {
  campaigns: Campaign[]
  lists: ListOption[]
  sortField: CampSortField
  sortDir: SortDir
  onSort: (field: CampSortField) => void
  onRun: (id: string) => void
  onDelete: (id: string) => void
}) {
  const listsById = useMemo(() => {
    const map = new Map<string, string>()
    for (const l of lists) map.set(l.id, l.name)
    return map
  }, [lists])
  const sorted = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      const va = a[sortField].toLowerCase()
      const vb = b[sortField].toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [campaigns, sortField, sortDir])

  const columns: [CampSortField, string][] = [
    ['name', 'Nazwa'],
    ['status', 'Status'],
  ]

  return (
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
              {columns.map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => onSort(field)}
                  className="text-left px-4 py-2 font-medium cursor-pointer select-none hover:text-[var(--foreground)] transition-colors"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <CampaignSortIcon field={field} sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
              ))}
              <th
                className="text-left px-4 py-2 font-medium"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Lista
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/dashboard/campaigns/${c.id}`} className="hover:underline text-foreground">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? ''}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {c.listId ? (
                    <Link href={`/dashboard/lists/${c.listId}`} className="hover:underline">
                      {listsById.get(c.listId) ?? '—'}
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {c.lastRunId && (
                      <Link href={`/dashboard/runs/${c.lastRunId}`} className="text-blue-500 hover:underline text-xs">
                        Ostatni run
                      </Link>
                    )}
                    <button
                      onClick={() => onRun(c.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                    >
                      Uruchom
                    </button>
                    <button
                      onClick={() => onDelete(c.id)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Usuń
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>Brak kampanii</td>
              </tr>
            )}
          </tbody>
        </table>
  )
}
