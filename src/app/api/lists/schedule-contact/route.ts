import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { lists, listContacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { and, eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { contactId, targetDate, targetTime, listName, reason } = body as {
    contactId: string
    targetDate: string
    targetTime: string | null
    listName: string
    reason: string
  }

  // Find or create the target list
  const existing = await db
    .select()
    .from(lists)
    .where(and(eq(lists.clientId, session.clientId), eq(lists.name, listName)))
    .limit(1)

  let targetList = existing[0]
  if (!targetList) {
    const [created] = await db
      .insert(lists)
      .values({ clientId: session.clientId, name: listName })
      .returning()
    targetList = created
  }

  // Compute followUpAt and order (minutes of day for sorting within the list)
  const time = targetTime || '09:00'
  const followUpAt = new Date(`${targetDate}T${time}:00`)
  const [h, m] = time.split(':').map(Number)
  const orderValue = h * 60 + m

  await db
    .insert(listContacts)
    .values({
      listId: targetList.id,
      contactId,
      order: orderValue,
      status: 'NOT_CALLED',
      notes: `[${reason}]`,
      followUpAt,
    })
    .onConflictDoNothing()

  return NextResponse.json({ listId: targetList.id, listName: targetList.name })
}
