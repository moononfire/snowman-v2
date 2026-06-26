import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { locale } = await req.json()
  if (!['pl', 'en', 'de'].includes(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  }

  const rows = await db.select().from(clients).where(eq(clients.id, session.clientId)).limit(1)
  const existing = (rows[0]?.config ?? {}) as Record<string, unknown>

  await db
    .update(clients)
    .set({ config: { ...existing, locale } })
    .where(eq(clients.id, session.clientId))

  return NextResponse.json({ locale })
}
