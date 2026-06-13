import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { lists, listContacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { and, eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: listId, contactId } = await params
  const listRows = await db.select().from(lists).where(and(eq(lists.id, listId), eq(lists.clientId, session.clientId))).limit(1)
  if (!listRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const rows = await db
    .update(listContacts)
    .set({
      status: body.status,
      notes: body.notes ?? undefined,
      followUpAt: body.followUpAt ? new Date(body.followUpAt) : undefined,
      calledAt: body.calledAt ? new Date(body.calledAt) : new Date(),
    })
    .where(and(eq(listContacts.listId, listId), eq(listContacts.contactId, contactId)))
    .returning()

  return NextResponse.json(rows[0])
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: listId, contactId } = await params
  const listRows = await db.select().from(lists).where(and(eq(lists.id, listId), eq(lists.clientId, session.clientId))).limit(1)
  if (!listRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(listContacts).where(and(eq(listContacts.listId, listId), eq(listContacts.contactId, contactId)))
  return new NextResponse(null, { status: 204 })
}
