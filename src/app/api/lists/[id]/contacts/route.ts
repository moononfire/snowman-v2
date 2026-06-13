import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { lists, listContacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { and, eq, desc } from 'drizzle-orm'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: listId } = await params
  const listRows = await db.select().from(lists).where(and(eq(lists.id, listId), eq(lists.clientId, session.clientId))).limit(1)
  if (!listRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const contactIds: string[] = body.contactIds

  const existing = await db
    .select({ order: listContacts.order })
    .from(listContacts)
    .where(eq(listContacts.listId, listId))
    .orderBy(desc(listContacts.order))
    .limit(1)

  const maxOrder = existing[0]?.order ?? -1

  await db.insert(listContacts).values(
    contactIds.map((contactId, i) => ({
      listId,
      contactId,
      order: maxOrder + 1 + i,
    }))
  ).onConflictDoNothing()

  return NextResponse.json({ added: contactIds.length }, { status: 201 })
}
