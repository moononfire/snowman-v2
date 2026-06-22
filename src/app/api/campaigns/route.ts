import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { campaigns } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.clientId, session.clientId))
    .orderBy(desc(campaigns.createdAt))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, script, config, listId } = await req.json()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  const rows = await db
    .insert(campaigns)
    .values({
      clientId: session.clientId,
      name,
      script: script ?? 'send_campaign',
      config: config ?? {},
      listId: listId ?? null,
      status: 'draft',
    })
    .returning()

  return NextResponse.json(rows[0], { status: 201 })
}
