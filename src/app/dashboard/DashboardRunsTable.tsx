'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

type Run = {
  id: string
  script: string
  status: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
}

type SortField = 'script' | 'status' | 'createdAt'
type SortDir = 'asc' | 'desc'

export default function DashboardRunsTable({ runs }: { runs: Run[] }) {
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  const sorted = useMemo(() => {
    return [...runs].sort((a, b) => {
      const va = a[sortField] ?? ''
      const vb = b[sortField] ?? ''
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [runs, sortField, sortDir])

  const columns: [SortField, string][] = [
    ['script', 'Skrypt'],
    ['status', 'Status'],
    ['createdAt', 'Data'],
  ]

  return (
    <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[500px]">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {columns.map(([field, label]) => (
            <th
              key={field}
              onClick={() => toggleSort(field)}
              className="text-left px-4 py-2 font-medium cursor-pointer select-none hover:text-[var(--foreground)] transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <span className="inline-flex items-center gap-1">
                {label}
                <SortIcon field={field} />
              </span>
            </th>
          ))}
          <th className="px-4 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((run) => (
          <tr key={run.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
            <td className="px-4 py-3 font-mono">{run.script}</td>
            <td className="px-4 py-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[run.status] ?? ''}`}>
                {run.status}
              </span>
            </td>
            <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>
              {new Date(run.createdAt).toLocaleString('pl')}
            </td>
            <td className="px-4 py-3">
              <Link href={`/dashboard/runs/${run.id}`} className="text-blue-500 hover:underline">Szczegóły</Link>
            </td>
          </tr>
        ))}
        {runs.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>Brak runów</td>
          </tr>
        )}
      </tbody>
    </table>
    </div>
  )
}
