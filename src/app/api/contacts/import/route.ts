import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { contacts } from '@/db/schema'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const rows: Record<string, string>[] = body.rows

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Brak danych' }, { status: 400 })
  }

  const data = rows
    .map((r) => ({
      clientId: session.clientId,
      firstName: r.firstName || r.first_name || r.imie || r['imię'] || '',
      lastName: r.lastName || r.last_name || r.nazwisko || null,
      phone: r.phone || r.telefon || r.tel || '',
      company: r.company || r.firma || null,
      position: r.position || r.stanowisko || null,
      email: r.email || r.mail || null,
      preCallNote: r.preCallNote || r.note || r.notatka || null,
      tags: r.tags || r.tagi || null,
      source: 'CSV_IMPORT' as const,
    }))
    .filter((r) => r.firstName && r.phone)

  if (data.length === 0) {
    return NextResponse.json({ error: 'Brak prawidłowych rekordów (wymagane: imię, telefon)' }, { status: 400 })
  }

  const inserted = await db.insert(contacts).values(data).returning()

  return NextResponse.json({ created: inserted.length }, { status: 201 })
}
