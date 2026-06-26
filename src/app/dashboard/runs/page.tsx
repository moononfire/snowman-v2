export const dynamic = 'force-dynamic'

import { db } from '@/db'
import { runs, clients } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { type Locale, t } from '@/lib/i18n'
import NewGoogleScrapeButton from './NewGoogleScrapeButton'
import RunsTable from './RunsTable'

export default async function RunsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let locale: Locale = 'pl'
  const clientRows = await db.select().from(clients).where(eq(clients.id, session.clientId)).limit(1)
  const config = clientRows[0]?.config as Record<string, unknown> | null
  const stored = config?.locale as string | undefined
  if (stored === 'en' || stored === 'de' || stored === 'pl') locale = stored

  const allRuns = await db
    .select()
    .from(runs)
    .where(eq(runs.clientId, session.clientId))
    .orderBy(desc(runs.createdAt))

  const serialized = allRuns.map((r) => ({
    id: r.id,
    script: r.script,
    status: r.status,
    startedAt: r.startedAt?.toISOString() ?? null,
    finishedAt: r.finishedAt?.toISOString() ?? null,
  }))

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t(locale, 'runsTitle')}</h1>
        <NewGoogleScrapeButton />
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ background: 'var(--card)' }}>
        <RunsTable runs={serialized} />
      </div>
    </div>
  )
}
