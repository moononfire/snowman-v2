'use server'

import { db } from '@/db'
import { clientAuth } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

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
