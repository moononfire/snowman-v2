import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { campaigns, runs, listContacts, contacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { vps } from '@/lib/vpsClient'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const rows = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.clientId, session.clientId)))
    .limit(1)

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const campaign = rows[0]
  const runId = randomUUID()
  const params_: Record<string, unknown> = { ...(campaign.config as Record<string, unknown>) }

  if (campaign.listId) {
    const contactRows = await db
      .select({
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        phone: contacts.phone,
        email: contacts.email,
        company: contacts.company,
        website: contacts.website,
      })
      .from(listContacts)
      .innerJoin(contacts, eq(listContacts.contactId, contacts.id))
      .where(eq(listContacts.listId, campaign.listId))

    params_.contacts = contactRows
    params_.listId = campaign.listId
  }

  await db.insert(runs).values({
    id: runId,
    clientId: session.clientId,
    script: campaign.script,
    status: 'pending',
    params: params_,
  })

  const webhookUrl = `${process.env.NEXTJS_URL}/api/webhooks/run-complete`

  let vpsRes: Response | null = null
  try {
    vpsRes = await vps.startRun({
      runId,
      clientSlug: session.clientSlug,
      script: campaign.script,
      params: params_,
      webhookUrl,
    })
  } catch {
    await db.update(runs).set({ status: 'error', errorMessage: 'VPS unavailable' }).where(eq(runs.id, runId))
    return NextResponse.json({ error: 'VPS unavailable' }, { status: 502 })
  }

  if (!vpsRes.ok) {
    await db.update(runs).set({ status: 'error', errorMessage: 'VPS error' }).where(eq(runs.id, runId))
    return NextResponse.json({ error: 'VPS error' }, { status: 502 })
  }

  const { vpsRunId } = await vpsRes.json()

  await db
    .update(runs)
    .set({ vpsRunId, status: 'running', startedAt: new Date() })
    .where(eq(runs.id, runId))

  await db
    .update(campaigns)
    .set({ status: 'running', lastRunId: runId })
    .where(eq(campaigns.id, id))

  return NextResponse.json({ runId, status: 'running' })
}
