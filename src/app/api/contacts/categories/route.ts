import { NextResponse } from 'next/server'
import { db } from '@/db'
import { contacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, isNotNull } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select({ tags: contacts.tags })
    .from(contacts)
    .where(eq(contacts.clientId, session.clientId))

  const set = new Set<string>()
  for (const row of rows) {
    if (!row.tags) continue
    for (const tag of row.tags.split(',')) {
      const t = tag.trim()
      if (t) set.add(t)
    }
  }

  return NextResponse.json([...set].sort((a, b) => a.localeCompare(b, 'pl')))
}
