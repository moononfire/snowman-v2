import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { lists, listContacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, desc, inArray } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(lists)
    .where(eq(lists.clientId, session.clientId))
    .orderBy(desc(lists.createdAt))

  if (rows.length === 0) return NextResponse.json([])

  const listIds = rows.map((l) => l.id)
  const allLcs = await db
    .select({ listId: listContacts.listId, status: listContacts.status })
    .from(listContacts)
    .where(inArray(listContacts.listId, listIds))

  const lcsByList = new Map<string, { status: string }[]>()
  for (const lc of allLcs) {
    const arr = lcsByList.get(lc.listId) ?? []
    arr.push({ status: lc.status })
    lcsByList.set(lc.listId, arr)
  }

  const result = rows.map((list) => {
    const lcs = lcsByList.get(list.id) ?? []
    return {
      ...list,
      listContacts: lcs,
      _count: { listContacts: lcs.length },
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const rows = await db
    .insert(lists)
    .values({
      clientId: session.clientId,
      name: body.name,
      description: body.description || null,
    })
    .returning()

  return NextResponse.json(rows[0], { status: 201 })
}
