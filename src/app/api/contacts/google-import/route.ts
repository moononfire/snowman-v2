import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { clients, contacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'

type GoogleContact = {
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  phone?: string
  telefon?: string
  company?: string
  firma?: string
  position?: string
  stanowisko?: string
  email?: string
  city?: string
  miasto?: string
  note?: string
  tags?: string
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const rows: GoogleContact[] = body.rows

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Brak danych' }, { status: 400 })
  }

  const [client] = await db.select({ config: clients.config }).from(clients).where(eq(clients.id, session.clientId))
  const blockedCompanies: string[] = (() => {
    const cfg = client?.config as Record<string, unknown> | undefined
    const list = cfg?.blockedCompanies
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string').map(s => s.toLowerCase()) : []
  })()

  const data = rows
    .map((r) => ({
      clientId: session.clientId,
      firstName: r.firstName || r.first_name || '',
      lastName: r.lastName || r.last_name || null,
      phone: r.phone || r.telefon || '',
      company: r.company || r.firma || null,
      position: r.position || r.stanowisko || null,
      email: r.email || null,
      city: r.city || r.miasto || null,
      preCallNote: r.note || null,
      tags: r.tags || null,
      source: 'GOOGLE_SCRAPE' as const,
    }))
    .filter((r) => r.firstName && r.phone)
    .filter((r) => !r.company || !blockedCompanies.includes(r.company.toLowerCase()))

  if (data.length === 0) {
    return NextResponse.json({ error: 'Brak prawidłowych rekordów (wymagane: firstName, phone)' }, { status: 400 })
  }

  const inserted = await db.insert(contacts).values(data).onConflictDoNothing({ target: [contacts.clientId, contacts.googlePlaceId] }).returning()

  return NextResponse.json({ created: inserted.length }, { status: 201 })
}
