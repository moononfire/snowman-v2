import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { runs, contacts, clients } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { vps } from '@/lib/vpsClient'
import { eq, desc, inArray, and, isNotNull, isNull } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(runs)
    .where(eq(runs.clientId, session.clientId))
    .orderBy(desc(runs.createdAt))
    .limit(50)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { script, params = {} } = await req.json()
  if (!script) return NextResponse.json({ error: 'Missing script' }, { status: 400 })

  if (script === 'scrape_google_maps' && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    params.api_key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  }

  if (script === 'scrape_contact_emails') {
    const contactIds: string[] = (params.contact_ids as string ?? '').split(',').filter(Boolean)
    if (contactIds.length === 0) {
      return NextResponse.json({ error: 'No contact IDs provided' }, { status: 400 })
    }
    const rows = await db
      .select({ id: contacts.id, website: contacts.website })
      .from(contacts)
      .where(and(
        eq(contacts.clientId, session.clientId),
        inArray(contacts.id, contactIds),
        isNotNull(contacts.website),
        isNull(contacts.email),
      ))
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No contacts with website and without email found' }, { status: 400 })
    }
    const payload = rows.map(r => ({ id: r.id, website: r.website! }))
    params.contacts = Buffer.from(JSON.stringify(payload)).toString('base64')
    delete params.contact_ids

    // Pass ignored email patterns from client config
    const clientRows = await db.select({ config: clients.config }).from(clients).where(eq(clients.id, session.clientId)).limit(1)
    const config = clientRows[0]?.config as Record<string, unknown> | null
    const ignoredPatterns = (config?.ignoredEmailPatterns as string[] | undefined) ?? []
    if (ignoredPatterns.length > 0) {
      params.ignored_patterns = ignoredPatterns.join(',')
    }
  }

  const runId = randomUUID()

  await db.insert(runs).values({
    id: runId,
    clientId: session.clientId,
    script,
    status: 'pending',
    params,
  })

  if (!process.env.NEXTJS_URL) {
    console.error('[runs] NEXTJS_URL env var nie ustawiony — VPS nie będzie mógł wysłać webhooka!')
  }
  const webhookUrl = `${process.env.NEXTJS_URL}/api/webhooks/run-complete`

  let vpsRes: Response | null = null
  try {
    vpsRes = await vps.startRun({ runId, clientSlug: session.clientSlug, script, params, webhookUrl })
  } catch {
    await db.update(runs).set({ status: 'error', errorMessage: 'VPS unavailable' }).where(eq(runs.id, runId))
    return NextResponse.json({ error: 'VPS unavailable' }, { status: 502 })
  }

  if (!vpsRes.ok) {
    const text = await vpsRes.text()
    await db.update(runs).set({ status: 'error', errorMessage: text }).where(eq(runs.id, runId))
    return NextResponse.json({ error: text }, { status: 502 })
  }

  const { vpsRunId } = await vpsRes.json()

  await db
    .update(runs)
    .set({ vpsRunId, status: 'running', startedAt: new Date() })
    .where(eq(runs.id, runId))

  return NextResponse.json({ runId, status: 'running' })
}
