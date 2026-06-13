export const dynamic = 'force-dynamic'

import { db } from '@/db'
import { runs } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { and, eq } from 'drizzle-orm'
import { redirect, notFound } from 'next/navigation'
import { RunDetails } from './RunDetails'

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const rows = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, id), eq(runs.clientId, session.clientId)))
    .limit(1)

  if (!rows.length) notFound()

  return <RunDetails initialRun={rows[0]} />
}
