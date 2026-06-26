import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { contacts, contactEmails } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  // Verify contact belongs to this client
  const contact = await db.select({ id: contacts.id }).from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.clientId, session.clientId))).limit(1)
  if (!contact.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Unset all primary for this contact
  await db.update(contactEmails).set({ isPrimary: false }).where(eq(contactEmails.contactId, id))

  // Set new primary
  await db.update(contactEmails).set({ isPrimary: true })
    .where(and(eq(contactEmails.contactId, id), eq(contactEmails.email, email)))

  // Sync to contacts.email
  await db.update(contacts).set({ email }).where(eq(contacts.id, id))

  return NextResponse.json({ ok: true })
}
