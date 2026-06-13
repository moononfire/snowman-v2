import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/db'
import { clients, clientAuth } from '@/db/schema'
import { vps } from '@/lib/vpsClient'
import { createSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { eq, and, isNull } from 'drizzle-orm'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  let body: { sessionId: string; slug: string; password: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { sessionId, slug, password } = body

  if (!sessionId || !slug || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!/^[a-z0-9-]{3,30}$/.test(slug)) {
    return NextResponse.json({ error: 'Nieprawidłowy slug' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Hasło musi mieć minimum 8 znaków' }, { status: 400 })
  }

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    return NextResponse.json({ error: 'Nie znaleziono sesji zakupu' }, { status: 400 })
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Sesja nie jest opłacona' }, { status: 400 })
  }

  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  if (!stripeCustomerId) {
    return NextResponse.json({ error: 'Nie znaleziono sesji zakupu' }, { status: 400 })
  }

  const clientRows = await db.select().from(clients)
    .where(eq(clients.stripeCustomerId, stripeCustomerId))
    .limit(1)

  if (!clientRows.length) {
    return NextResponse.json({ error: 'Nie znaleziono sesji zakupu' }, { status: 400 })
  }

  const client = clientRows[0]

  if (client.onboardingCompletedAt !== null) {
    return NextResponse.json({ alreadyActivated: true }, { status: 409 })
  }

  const slugTaken = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1)
  if (slugTaken.length > 0) {
    return NextResponse.json({ slugTaken: true }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await db.transaction(async (tx) => {
    await tx.update(clients)
      .set({ slug, name: slug, onboardingCompletedAt: new Date() })
      .where(and(eq(clients.stripeCustomerId, stripeCustomerId), isNull(clients.onboardingCompletedAt)))

    await tx.insert(clientAuth).values({ clientId: client.id, passwordHash })
  })

  const vpsRes = await vps.createClient(slug, slug).catch(() => null)
  if (!vpsRes || !vpsRes.ok) {
    await db.delete(clientAuth).where(eq(clientAuth.clientId, client.id))
    await db.update(clients)
      .set({ slug: null, name: client.name, onboardingCompletedAt: null })
      .where(eq(clients.stripeCustomerId, stripeCustomerId))
    return NextResponse.json({ error: 'Błąd konfiguracji serwera' }, { status: 500 })
  }

  await createSession(client.id, slug)
  return NextResponse.json({ ok: true })
}
