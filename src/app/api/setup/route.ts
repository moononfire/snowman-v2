import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { clients, clientAuth } from '@/db/schema'
import { vps } from '@/lib/vpsClient'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-agency-secret')
  if (secret !== process.env.AGENCY_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { tenantId, slug, adminName, adminEmail, adminPassword } = body

  if (!slug || !adminName || !adminPassword) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1)
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, message: 'Already exists' })
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10)

  await db.insert(clients).values({
    id: tenantId,
    slug,
    name: adminName,
    email: adminEmail,
    status: 'active',
    config: {},
  })

  await db.insert(clientAuth).values({
    clientSlug: slug,
    passwordHash,
  })

  const vpsRes = await vps.createClient(slug, adminName).catch(() => null)
  if (!vpsRes || !vpsRes.ok) {
    await db.delete(clientAuth).where(eq(clientAuth.clientSlug, slug))
    await db.delete(clients).where(eq(clients.slug, slug))
    return NextResponse.json({ error: 'VPS setup failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
