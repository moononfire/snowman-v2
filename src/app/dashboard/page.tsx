export const dynamic = 'force-dynamic'

import { db } from '@/db'
import { runs } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, desc, count } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [countRows, recentRuns] = await Promise.all([
    db.select({ count: count() }).from(runs).where(eq(runs.clientId, session.clientId)),
    db.select().from(runs).where(eq(runs.clientId, session.clientId)).orderBy(desc(runs.createdAt)).limit(10),
  ])

  const totalRuns = countRows[0]?.count ?? 0
  const lastRun = recentRuns[0]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border p-6" style={{ background: 'var(--card)' }}>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Łączne runy</p>
          <p className="text-3xl font-bold mt-1">{totalRuns}</p>
        </div>
        <div className="rounded-lg border p-6" style={{ background: 'var(--card)' }}>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Ostatni run</p>
          <p className="text-lg font-semibold mt-1">{lastRun ? lastRun.script : '—'}</p>
          {lastRun && (
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${STATUS_COLORS[lastRun.status] ?? ''}`}>
              {lastRun.status}
            </span>
          )}
        </div>
        <div className="rounded-lg border p-6" style={{ background: 'var(--card)' }}>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Klient</p>
          <p className="text-lg font-semibold mt-1 font-mono">{session.clientSlug}</p>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ background: 'var(--card)' }}>
        <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold">Ostatnie runy</h2>
          <Link href="/dashboard/runs" className="text-sm text-blue-500 hover:underline">Zobacz wszystkie</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
              <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Skrypt</th>
              <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Status</th>
              <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Data</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {recentRuns.map((run) => (
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
            {recentRuns.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>Brak runów</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
