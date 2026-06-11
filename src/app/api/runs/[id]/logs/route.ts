import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { runs } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { vps } from '@/lib/vpsClient'
import { and, eq } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const rows = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, id), eq(runs.clientSlug, session.clientSlug)))
    .limit(1)

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const run = rows[0]
  if (!run.vpsRunId) return new NextResponse('', { status: 200 })

  const tail = req.nextUrl.searchParams.get('tail')
  const vpsRes = await vps.getLogs(run.vpsRunId, tail ? parseInt(tail) : undefined)

  const text = await vpsRes.text()
  return new NextResponse(text, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
