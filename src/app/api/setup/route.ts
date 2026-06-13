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

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { tenantId, slug, adminName, adminEmail, adminPassword } = body

  if (!slug || !adminName || !adminPassword) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const existing = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, message: 'Already exists' })
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10)
    const clientId = tenantId ?? crypto.randomUUID()

    await db.insert(clients).values({
      id: clientId,
      slug,
      name: adminName,
      email: adminEmail,
      status: 'active',
      config: {},
    })

    await db.insert(clientAuth).values({
      clientId,
      passwordHash,
    })

    const vpsRes = await vps.createClient(slug, adminName).catch(() => null)
    if (!vpsRes || !vpsRes.ok) {
      await db.delete(clientAuth).where(eq(clientAuth.clientId, clientId))
      await db.delete(clients).where(eq(clients.id, clientId))
      return NextResponse.json({ error: 'VPS setup failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/setup]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
