import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { lists, listContacts, contacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { and, eq, asc } from 'drizzle-orm'

async function getOwnedList(id: string, clientId: string) {
  const rows = await db.select().from(lists).where(and(eq(lists.id, id), eq(lists.clientId, clientId))).limit(1)
  return rows[0] ?? null
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const list = await getOwnedList(id, session.clientId)
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lcs = await db
    .select()
    .from(listContacts)
    .where(eq(listContacts.listId, id))
    .orderBy(asc(listContacts.order))

  const contactIds = lcs.map((lc) => lc.contactId)
  const contactMap = new Map<string, typeof contacts.$inferSelect>()
  if (contactIds.length > 0) {
    const { inArray } = await import('drizzle-orm')
    const contactRows = await db.select().from(contacts).where(inArray(contacts.id, contactIds))
    for (const c of contactRows) contactMap.set(c.id, c)
  }

  const listContactsWithContact = lcs.map((lc) => ({
    ...lc,
    contact: contactMap.get(lc.contactId)!,
  }))

  return NextResponse.json({ ...list, listContacts: listContactsWithContact })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const owned = await getOwnedList(id, session.clientId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const rows = await db
    .update(lists)
    .set({ name: body.name, description: body.description || null, updatedAt: new Date() })
    .where(eq(lists.id, id))
    .returning()

  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const owned = await getOwnedList(id, session.clientId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(lists).where(eq(lists.id, id))
  return new NextResponse(null, { status: 204 })
}
