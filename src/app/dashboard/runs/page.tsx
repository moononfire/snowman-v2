export const dynamic = 'force-dynamic'

import { db } from '@/db'
import { runs } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
}

export default async function RunsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allRuns = await db
    .select()
    .from(runs)
    .where(eq(runs.clientSlug, session.clientSlug))
    .orderBy(desc(runs.createdAt))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Historia runów</h1>

      <div className="bg-white rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-2 font-medium text-gray-600">Skrypt</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Rozpoczęty</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Zakończony</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {allRuns.map((run) => (
              <tr key={run.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{run.script}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[run.status] ?? ''}`}>
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {run.startedAt ? new Date(run.startedAt).toLocaleString('pl') : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {run.finishedAt ? new Date(run.finishedAt).toLocaleString('pl') : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/runs/${run.id}`} className="text-blue-600 hover:underline">Szczegóły</Link>
                </td>
              </tr>
            ))}
            {allRuns.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Brak runów</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
