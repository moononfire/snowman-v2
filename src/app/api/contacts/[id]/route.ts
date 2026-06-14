import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { contacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { and, eq } from 'drizzle-orm'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const rows = await db.select().from(contacts).where(and(eq(contacts.id, id), eq(contacts.clientId, session.clientId))).limit(1)
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const rows = await db
    .update(contacts)
    .set({
      firstName: body.firstName,
      lastName: body.lastName || null,
      phone: body.phone,
      company: body.company || null,
      position: body.position || null,
      email: body.email || null,
      website: body.website || null,
      preCallNote: body.preCallNote || null,
      postCallNote: body.postCallNote || null,
      tags: body.tags || null,
      updatedAt: new Date(),
    })
    .where(and(eq(contacts.id, id), eq(contacts.clientId, session.clientId)))
    .returning()

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.clientId, session.clientId)))
  return new NextResponse(null, { status: 204 })
}
