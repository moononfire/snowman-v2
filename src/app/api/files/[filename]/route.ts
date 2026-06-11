import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { vps } from '@/lib/vpsClient'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename } = await params
  const vpsRes = await vps.getFile(session.clientSlug, filename)

  if (!vpsRes.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await vpsRes.arrayBuffer()
  return new NextResponse(body, {
    headers: {
      'Content-Type': vpsRes.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename } = await params
  await vps.deleteFile(session.clientSlug, filename)
  return NextResponse.json({ ok: true })
}
