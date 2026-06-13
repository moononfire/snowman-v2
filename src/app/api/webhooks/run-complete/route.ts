import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { runs, contacts, clients } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { vps } from '@/lib/vpsClient'

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, '').replace(/\r/g, '').trim().split('\n')
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = parseCSVLine(line)
      return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]))
    })
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.VPS_WORKER_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { runId, vpsRunId, status, outputFiles, errorMessage, finishedAt } = await req.json()

  const runRows = await db.select().from(runs).where(eq(runs.id, runId)).limit(1)
  if (!runRows.length) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  const run = runRows[0]

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

  if (status === 'done' && run.script === 'scrape_google_maps' && Array.isArray(outputFiles) && outputFiles.length > 0) {
    const clientRows = await db.select().from(clients).where(eq(clients.id, run.clientId)).limit(1)
    const slug = clientRows[0]?.slug
    console.log(`[run-complete] runId=${runId} clientId=${run.clientId} slug=${slug} outputFiles=${JSON.stringify(outputFiles)}`)

    if (!slug) {
      const errMsg = `Brak slug dla clientId=${run.clientId} — kontakty nie zaimportowane`
      console.error(`[run-complete] ${errMsg}`)
      await db.update(runs).set({ errorMessage: errMsg }).where(eq(runs.id, runId))
    } else {
      let totalImported = 0
      const importErrors: string[] = []

      for (const filename of outputFiles as string[]) {
        try {
          const res = await vps.getFile(slug, filename)
          if (!res.ok) {
            const msg = `getFile ${filename}: HTTP ${res.status} ${res.statusText}`
            console.error(`[run-complete] ${msg}`)
            importErrors.push(msg)
            continue
          }
          const text = await res.text()
          const rows = parseCSV(text)
          console.log(`[run-complete] file=${filename} rows=${rows.length} firstRow=${JSON.stringify(rows[0])}`)
          const data = rows
            .filter(r => r.name || r.phone)
            .map(r => ({
              clientId: run.clientId,
              firstName: r.name || '—',
              company: r.name || null,
              phone: r.phone || '',
              preCallNote: [r.address, r.city, r.country].filter(Boolean).join(', ') || null,
              tags: r.category_google || null,
              source: 'GOOGLE_SCRAPE' as const,
            }))
          console.log(`[run-complete] inserting ${data.length} contacts from ${filename}`)
          if (data.length > 0) {
            await db.insert(contacts).values(data)
            totalImported += data.length
          }
        } catch (err) {
          const msg = `${filename}: ${err instanceof Error ? err.message : String(err)}`
          console.error(`[run-complete] error processing file=${msg}`, err)
          importErrors.push(msg)
        }
      }

      if (importErrors.length > 0) {
        const existing = run.errorMessage ?? ''
        const errSuffix = `Import błędy: ${importErrors.join('; ')}`
        await db.update(runs).set({ errorMessage: [existing, errSuffix].filter(Boolean).join(' | ') }).where(eq(runs.id, runId))
      }
      console.log(`[run-complete] done — zaimportowano ${totalImported} kontaktów, błędy: ${importErrors.length}`)
    }
  } else if (status === 'done' && run.script === 'scrape_google_maps') {
    console.log(`[run-complete] runId=${runId} done ale outputFiles puste lub brak — sprawdź logi VPS`)
  }

  return NextResponse.json({ ok: true })
}
