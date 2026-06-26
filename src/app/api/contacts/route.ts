import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { clients, contacts, listContacts, contactEmails } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and, isNull, isNotNull, ilike, or, ne, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const VALID_SOURCES = new Set(['MANUAL', 'CSV_IMPORT', 'GOOGLE_SCRAPE'])

export async function GET(req: NextRequest) {
  try {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('q') ?? ''
  const sourceParam = req.nextUrl.searchParams.get('source') ?? ''
  const tagsParam = req.nextUrl.searchParams.get('tags') ?? ''
  const hasCompanyParam = req.nextUrl.searchParams.get('hasCompany') ?? ''
  const hasEmailParam = req.nextUrl.searchParams.get('hasEmail') ?? ''
  const hasWebsiteParam = req.nextUrl.searchParams.get('hasWebsite') ?? ''
  const calledParam = req.nextUrl.searchParams.get('called') ?? ''
  const cityParam = req.nextUrl.searchParams.get('city') ?? ''
  const source = VALID_SOURCES.has(sourceParam) ? sourceParam : null

  const conditions = [eq(contacts.clientId, session.clientId)]
  if (source) conditions.push(eq(contacts.source, source))
  if (tagsParam) {
    const tagList = tagsParam.split(',').map((t) => t.trim()).filter(Boolean)
    if (tagList.length === 1) {
      conditions.push(ilike(contacts.tags, `%${tagList[0]}%`))
    } else if (tagList.length > 1) {
      conditions.push(or(...tagList.map((tag) => ilike(contacts.tags, `%${tag}%`)))!)
    }
  }
  if (hasCompanyParam === 'yes') conditions.push(isNotNull(contacts.company))
  if (hasCompanyParam === 'no') conditions.push(isNull(contacts.company))
  if (hasEmailParam === 'yes') conditions.push(isNotNull(contacts.email))
  if (hasEmailParam === 'no') conditions.push(isNull(contacts.email))
  if (hasWebsiteParam === 'yes') conditions.push(isNotNull(contacts.website))
  if (hasWebsiteParam === 'no') conditions.push(isNull(contacts.website))
  if (cityParam) {
    const cities = cityParam.split(',').filter(Boolean)
    if (cities.length === 1) conditions.push(eq(contacts.city, cities[0]))
    else if (cities.length > 1) conditions.push(inArray(contacts.city, cities))
  }
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

  const [client] = await db.select({ config: clients.config }).from(clients).where(eq(clients.id, session.clientId))
  const blockedCompanies: string[] = (() => {
    const cfg = client?.config as Record<string, unknown> | undefined
    const list = cfg?.blockedCompanies
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string').map(s => s.toLowerCase()) : []
  })()

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

  const ACTIVE_STATUSES = ['NOT_CALLED', 'NO_ANSWER', 'CALLBACK', 'VOICEMAIL']
  const lcCountMap: Map<string, number> = new Map()
  if (contactIds.length > 0) {
    const allLcs = await db
      .select({ contactId: listContacts.contactId })
      .from(listContacts)
      .where(inArray(listContacts.status, ACTIVE_STATUSES))
    for (const lc of allLcs) {
      if (!contactIds.includes(lc.contactId)) continue
      lcCountMap.set(lc.contactId, (lcCountMap.get(lc.contactId) ?? 0) + 1)
    }
  }

  // Fetch all emails for these contacts
  const emailsMap = new Map<string, { id: string; email: string; isPrimary: boolean }[]>()
  if (contactIds.length > 0) {
    try {
      const allEmails = await db.select({
        id: contactEmails.id,
        contactId: contactEmails.contactId,
        email: contactEmails.email,
        isPrimary: contactEmails.isPrimary,
      }).from(contactEmails).where(inArray(contactEmails.contactId, contactIds))
      for (const e of allEmails) {
        const list = emailsMap.get(e.contactId) ?? []
        list.push({ id: e.id, email: e.email, isPrimary: e.isPrimary })
        emailsMap.set(e.contactId, list)
      }
      // Sort: primary first, then by insertion order
      emailsMap.forEach((list) => list.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)))
    } catch {
      // contact_emails table may not exist yet — migration pending
    }
  }

  const result = rows.map((c) => {
    const lc = lcMap.get(c.id)
    return {
      ...c,
      listContacts: lc ? [{ status: lc.status, notes: lc.notes, calledAt: lc.calledAt }] : [],
      _count: { listContacts: lcCountMap.get(c.id) ?? 0 },
      emails: emailsMap.get(c.id) ?? [],
    }
  })

  let filtered = result
  if (blockedCompanies.length > 0) {
    filtered = filtered.filter((c) => !c.company || !blockedCompanies.includes(c.company.toLowerCase()))
  }
  if (calledParam === 'yes') filtered = filtered.filter((c) => c.listContacts.length > 0)
  if (calledParam === 'no') filtered = filtered.filter((c) => c.listContacts.length === 0)

  return NextResponse.json(filtered)
  } catch (e) {
    console.error('[GET /api/contacts]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
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
      website: body.website || null,
      city: body.city || null,
      preCallNote: body.preCallNote || null,
      postCallNote: body.postCallNote || null,
      tags: body.tags || null,
      source: 'MANUAL',
    })
    .returning()

  return NextResponse.json(rows[0], { status: 201 })
}
