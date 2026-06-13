'use server'

import { db } from '@/db'
import { clients, clientAuth } from '@/db/schema'
import { createSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

export async function loginAction(_state: unknown, formData: FormData) {
  const slug = (formData.get('slug') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!slug || !password) {
    return { error: 'Podaj slug i hasło' }
  }

  const clientRows = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1)
  if (!clientRows.length) {
    return { error: 'Nieprawidłowy slug lub hasło' }
  }

  const client = clientRows[0]

  if (client.status === 'suspended') {
    return { error: 'Konto zawieszone. Skontaktuj się z agencją.' }
  }

  if (client.subscriptionExpiresAt && client.subscriptionExpiresAt < new Date()) {
    return { error: 'Subskrypcja wygasła. Odnów dostęp w sklepie.' }
  }

  const authRows = await db.select().from(clientAuth).where(eq(clientAuth.clientId, client.id)).limit(1)
  if (!authRows.length) {
    return { error: 'Nieprawidłowy slug lub hasło' }
  }

  const valid = await bcrypt.compare(password, authRows[0].passwordHash)
  if (!valid) {
    return { error: 'Nieprawidłowy slug lub hasło' }
  }

  await createSession(client.id, slug)
  redirect('/dashboard')
}
