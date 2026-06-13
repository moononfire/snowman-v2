import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { clientAuth, passwordResetTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  let body: { token: string; password: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { token, password } = body

  if (!token) return NextResponse.json({ error: 'Nieprawidłowy link' }, { status: 400 })
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Hasło musi mieć minimum 8 znaków' }, { status: 400 })
  }

  const tokenRows = await db.select().from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1)

  if (!tokenRows.length) {
    return NextResponse.json({ error: 'Nieprawidłowy link' }, { status: 400 })
  }

  const resetToken = tokenRows[0]

  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Link wygasł' }, { status: 400 })
  }

  if (resetToken.usedAt !== null) {
    return NextResponse.json({ error: 'Link został już użyty' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await db.transaction(async (tx) => {
    await tx.update(clientAuth)
      .set({ passwordHash })
      .where(eq(clientAuth.clientId, resetToken.clientId))

    await tx.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token))
  })

  return NextResponse.json({ ok: true })
}
