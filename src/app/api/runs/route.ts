import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { runs } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { vps } from '@/lib/vpsClient'
import { eq, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(runs)
    .where(eq(runs.clientSlug, session.clientSlug))
    .orderBy(desc(runs.createdAt))
    .limit(50)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { script, params = {} } = await req.json()
  if (!script) return NextResponse.json({ error: 'Missing script' }, { status: 400 })

  const runId = randomUUID()

  await db.insert(runs).values({
    id: runId,
    clientSlug: session.clientSlug,
    script,
    status: 'pending',
    params,
  })

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
