import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { contacts, listContacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and, isNull, isNotNull, ilike, or, ne } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const VALID_SOURCES = new Set(['MANUAL', 'CSV_IMPORT', 'GOOGLE_SCRAPE'])

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('q') ?? ''
  const sourceParam = req.nextUrl.searchParams.get('source') ?? ''
  const tagsParam = req.nextUrl.searchParams.get('tags') ?? ''
  const hasCompanyParam = req.nextUrl.searchParams.get('hasCompany') ?? ''
  const hasEmailParam = req.nextUrl.searchParams.get('hasEmail') ?? ''
  const calledParam = req.nextUrl.searchParams.get('called') ?? ''
  const source = VALID_SOURCES.has(sourceParam) ? sourceParam : null

  const conditions = [eq(contacts.clientId, session.clientId)]
  if (source) conditions.push(eq(contacts.source, source))
  if (tagsParam) conditions.push(ilike(contacts.tags, `%${tagsParam}%`))
  if (hasCompanyParam === 'yes') conditions.push(isNotNull(contacts.company))
  if (hasCompanyParam === 'no') conditions.push(isNull(contacts.company))
  if (hasEmailParam === 'yes') conditions.push(isNotNull(contacts.email))
  if (hasEmailParam === 'no') conditions.push(isNull(contacts.email))
  if (search) {
    conditions.push(
      or(
        ilike(contacts.firstName, `%${search}%`),
        ilike(contacts.lastName, `%${search}%`),
        ilike(contacts.phone, `%${search}%`),
        ilike(contacts.company, `%${search}%`),
        ilike(contacts.tags, `%${search}%`),
      )!
    )
  }

  const rows = await db.select().from(contacts).where(and(...conditions))

  // Attach most recent non-NOT_CALLED listContact per contact
  const contactIds = rows.map((c) => c.id)
  let lcMap: Map<string, { status: string; notes: string | null; calledAt: Date | null }> = new Map()

  if (contactIds.length > 0) {
    const lcs = await db
      .select()
      .from(listContacts)
      .where(
        and(
          // contacts that belong to this client are enough — listContacts cascade protects
          ne(listContacts.status, 'NOT_CALLED')
        )
      )
    // Keep the latest per contactId
    for (const lc of lcs) {
      if (!contactIds.includes(lc.contactId)) continue
      const existing = lcMap.get(lc.contactId)
      if (!existing || (lc.calledAt && (!existing.calledAt || lc.calledAt > existing.calledAt))) {
        lcMap.set(lc.contactId, { status: lc.status, notes: lc.notes, calledAt: lc.calledAt })
      }
    }
  }

  // Count total listContacts per contact for "occupied" check
  const lcCountMap: Map<string, number> = new Map()
  if (contactIds.length > 0) {
    const allLcs = await db
      .select({ contactId: listContacts.contactId })
      .from(listContacts)
    for (const lc of allLcs) {
      if (!contactIds.includes(lc.contactId)) continue
      lcCountMap.set(lc.contactId, (lcCountMap.get(lc.contactId) ?? 0) + 1)
    }
  }

  const result = rows.map((c) => {
    const lc = lcMap.get(c.id)
    return {
      ...c,
      listContacts: lc ? [{ status: lc.status, notes: lc.notes, calledAt: lc.calledAt }] : [],
      _count: { listContacts: lcCountMap.get(c.id) ?? 0 },
    }
  })

  // Apply called filter in memory (simpler than subquery)
  let filtered = result
  if (calledParam === 'yes') filtered = result.filter((c) => c.listContacts.length > 0)
  if (calledParam === 'no') filtered = result.filter((c) => c.listContacts.length === 0)

  return NextResponse.json(filtered)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const rows = await db
    .insert(contacts)
    .values({
      clientId: session.clientId,
      firstName: body.firstName,
      lastName: body.lastName || null,
      phone: body.phone,
      company: body.company || null,
      position: body.position || null,
      email: body.email || null,
      preCallNote: body.preCallNote || null,
      postCallNote: body.postCallNote || null,
      tags: body.tags || null,
      source: 'MANUAL',
    })
    .returning()

  return NextResponse.json(rows[0], { status: 201 })
}
