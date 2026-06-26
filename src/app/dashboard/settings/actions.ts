'use server'

import { db } from '@/db'
import { clientAuth, clients } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import nodemailer from 'nodemailer'

export async function changePasswordAction(_state: unknown, formData: FormData) {
  const session = await getSession()
  if (!session) return { error: 'Brak sesji' }

  const current = formData.get('current') as string
  const next = formData.get('next') as string
  const confirm = formData.get('confirm') as string

  if (next !== confirm) return { error: 'Hasła nie są zgodne' }
  if (next.length < 6) return { error: 'Hasło musi mieć min. 6 znaków' }

  const authRows = await db.select().from(clientAuth).where(eq(clientAuth.clientId, session.clientId)).limit(1)
  if (!authRows.length) return { error: 'Błąd wewnętrzny' }

  const valid = await bcrypt.compare(current, authRows[0].passwordHash)
  if (!valid) return { error: 'Aktualne hasło jest nieprawidłowe' }

  const hash = await bcrypt.hash(next, 10)
  await db.update(clientAuth).set({ passwordHash: hash }).where(eq(clientAuth.clientId, session.clientId))
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function saveSmtpConfigAction(smtp: { email: string; appPassword: string }) {
  const session = await getSession()
  if (!session) return { success: false }

  const clientRows = await db.select().from(clients).where(eq(clients.id, session.clientId)).limit(1)
  const existing = (clientRows[0]?.config ?? {}) as Record<string, unknown>

  await db
    .update(clients)
    .set({ config: { ...existing, smtp: { email: smtp.email, appPassword: smtp.appPassword } } })
    .where(eq(clients.id, session.clientId))

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function saveIgnoredPatternsAction(patterns: string[]) {
  const session = await getSession()
  if (!session) return { success: false }

  const clientRows = await db.select().from(clients).where(eq(clients.id, session.clientId)).limit(1)
  const existing = (clientRows[0]?.config ?? {}) as Record<string, unknown>

  await db
    .update(clients)
    .set({ config: { ...existing, ignoredEmailPatterns: patterns } })
    .where(eq(clients.id, session.clientId))

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function testSmtpConnectionAction(smtp: { email: string; appPassword: string }) {
  const session = await getSession()
  if (!session) return { success: false, message: 'Brak sesji' }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: smtp.email, pass: smtp.appPassword.replace(/\s/g, '') },
    })
    await transporter.verify()
    return { success: true, message: 'Połączenie działa! Możesz wysyłać maile.' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, message: `Błąd: ${msg}` }
  }
}
