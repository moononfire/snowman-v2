export const dynamic = 'force-dynamic'

import { db } from '@/db'
import { runs } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewGoogleScrapeButton from './NewGoogleScrapeButton'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  done: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

export default async function RunsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allRuns = await db
    .select()
    .from(runs)
    .where(eq(runs.clientId, session.clientId))
    .orderBy(desc(runs.createdAt))

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pozyskaj kontakty</h1>
        <NewGoogleScrapeButton />
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ background: 'var(--card)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
              <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Skrypt</th>
              <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Status</th>
              <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Rozpoczęty</th>
              <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Zakończony</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {allRuns.map((run) => (
              <tr key={run.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 font-mono">{run.script}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[run.status] ?? ''}`}>
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>
                  {run.startedAt ? new Date(run.startedAt).toLocaleString('pl') : '—'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>
                  {run.finishedAt ? new Date(run.finishedAt).toLocaleString('pl') : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/runs/${run.id}`} className="text-blue-500 hover:underline">Szczegóły</Link>
                </td>
              </tr>
            ))}
            {allRuns.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>Brak runów</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
