import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { runs } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { and, eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const rows = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, id), eq(runs.clientSlug, session.clientSlug)))
    .limit(1)

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}
