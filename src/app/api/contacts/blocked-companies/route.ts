import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { clients, contacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and, ilike, or } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

function getBlockedList(config: Record<string, unknown>): string[] {
  const list = config?.blockedCompanies
  return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : []
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [client] = await db.select({ config: clients.config }).from(clients).where(eq(clients.id, session.clientId))
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ blockedCompanies: getBlockedList(client.config as Record<string, unknown>) })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const names: unknown = body.blockedCompanies
  if (!Array.isArray(names) || !names.every((n) => typeof n === 'string')) {
    return NextResponse.json({ error: 'blockedCompanies must be string[]' }, { status: 400 })
  }

  const deduplicated = [...new Set(names.map((n: string) => n.trim()).filter(Boolean))]

  const [client] = await db.select({ config: clients.config }).from(clients).where(eq(clients.id, session.clientId))
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const currentConfig = (client.config as Record<string, unknown>) ?? {}
  const previousBlocked = getBlockedList(currentConfig)
  const newNames = deduplicated.filter((n) => !previousBlocked.some((p) => p.toLowerCase() === n.toLowerCase()))

  await db
    .update(clients)
    .set({ config: { ...currentConfig, blockedCompanies: deduplicated } })
    .where(eq(clients.id, session.clientId))

  let deleted = 0
  if (newNames.length > 0) {
    const conditions = newNames.map((name) => ilike(contacts.company, name))
    const result = await db
      .delete(contacts)
      .where(and(eq(contacts.clientId, session.clientId), or(...conditions)!))
      .returning({ id: contacts.id })
    deleted = result.length
  }

  return NextResponse.json({ blockedCompanies: deduplicated, deleted })
}
