import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { db } from '@/db'
import { clients, passwordResetTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  let body: { email: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const { email } = body
  if (!email) return NextResponse.json({ ok: true })

  const clientRows = await db.select().from(clients)
    .where(eq(clients.email, email))
    .limit(1)

  const client = clientRows[0]
  if (!client || client.onboardingCompletedAt === null || !client.slug) {
    return NextResponse.json({ ok: true })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await db.insert(passwordResetTokens).values({
    clientId: client.id,
    token,
    expiresAt,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const link = `${appUrl}/reset-password?token=${token}`

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Reset hasła',
    html: `<p>Kliknij poniższy link, aby zresetować hasło (ważny przez 1 godzinę):</p><p><a href="${link}">${link}</a></p>`,
  })

  return NextResponse.json({ ok: true })
}
