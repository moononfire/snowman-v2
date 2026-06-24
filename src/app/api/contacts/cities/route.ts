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
    .selectDistinct({ city: contacts.city })
    .from(contacts)
    .where(eq(contacts.clientId, session.clientId))

  const cities = rows
    .map((r) => r.city)
    .filter((c): c is string => !!c)
    .sort((a, b) => a.localeCompare(b, 'pl'))

  return NextResponse.json(cities)
}
