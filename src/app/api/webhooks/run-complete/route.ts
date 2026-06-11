import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { runs } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.VPS_WORKER_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { runId, vpsRunId, status, outputFiles, errorMessage, finishedAt } = await req.json()

  await db
    .update(runs)
    .set({
      status,
      vpsRunId,
      outputFiles: outputFiles ?? [],
      errorMessage: errorMessage ?? null,
      finishedAt: finishedAt ? new Date(finishedAt) : new Date(),
    })
    .where(eq(runs.id, runId))

  return NextResponse.json({ ok: true })
}
