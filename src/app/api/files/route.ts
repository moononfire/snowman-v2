import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { vps } from '@/lib/vpsClient'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vpsRes = await vps.getFiles(session.clientSlug)
  if (!vpsRes.ok) return NextResponse.json([], { status: 200 })

  const files = await vpsRes.json()
  return NextResponse.json(files)
}
