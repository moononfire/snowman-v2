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
    console.error('[run-complete] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { runId, vpsRunId, status, outputFiles, errorMessage, finishedAt } = body
  // Log immediately — before any condition — so we always see what arrived
  console.log(`[run-complete] RECEIVED runId=${runId} status=${status} outputFiles=${JSON.stringify(outputFiles)} errorMessage=${errorMessage ?? null}`)

  const runRows = await db.select().from(runs).where(eq(runs.id, runId)).limit(1)
  if (!runRows.length) {
    console.error(`[run-complete] run not found: ${runId}`)
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }
  const run = runRows[0]
  console.log(`[run-complete] run.script=${run.script} run.clientId=${run.clientId}`)

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

  const isGoogleScrape = run.script === 'scrape_google_maps'
  const hasFiles = Array.isArray(outputFiles) && outputFiles.length > 0
  console.log(`[run-complete] isGoogleScrape=${isGoogleScrape} isDone=${status === 'done'} hasFiles=${hasFiles}`)

  if (status === 'done' && isGoogleScrape && hasFiles) {
    const clientRows = await db.select().from(clients).where(eq(clients.id, run.clientId)).limit(1)
    const slug = clientRows[0]?.slug
    console.log(`[run-complete] clientSlug=${slug}`)

    if (!slug) {
      const errMsg = `Brak slug dla clientId=${run.clientId} — kontakty nie zaimportowane`
      console.error(`[run-complete] ${errMsg}`)
      await db.update(runs).set({ errorMessage: errMsg }).where(eq(runs.id, runId))
    } else {
      let totalImported = 0
      const importErrors: string[] = []

      for (const filename of outputFiles as string[]) {
        try {
          console.log(`[run-complete] downloading ${filename} from slug=${slug}`)
          const res = await vps.getFile(slug, filename)
          if (!res.ok) {
            const msg = `getFile ${filename}: HTTP ${res.status} ${res.statusText}`
            console.error(`[run-complete] ${msg}`)
            importErrors.push(msg)
            continue
          }
          const text = await res.text()
          const rows = parseCSV(text)
          console.log(`[run-complete] file=${filename} size=${text.length}b parsed=${rows.length} rows firstRow=${JSON.stringify(rows[0])}`)
          const data = rows
            .filter(r => r.name || r.phone)
            .map(r => ({
              clientId: run.clientId,
              firstName: r.name || '—',
              company: r.name || null,
              phone: r.phone_international || r.phone || '',
              email: r.email || null,
              website: r.website || null,
              city: r.city || null,
              address: r.address || null,
              preCallNote: [r.address, r.city, r.country].filter(Boolean).join(', ') || null,
              tags: r.category_google || null,
              source: 'GOOGLE_SCRAPE' as const,
              googlePlaceId: r.place_id || null,
              googleMapsUrl: r.google_maps_url || null,
              latitude: r.latitude ? parseFloat(r.latitude) : null,
              longitude: r.longitude ? parseFloat(r.longitude) : null,
              rating: r.rating ? parseFloat(r.rating) : null,
              reviewCount: r.review_count ? parseInt(r.review_count, 10) : null,
              businessStatus: r.business_status || null,
              openingHours: r.opening_hours ? r.opening_hours.split('|') : null,
            }))
          console.log(`[run-complete] inserting ${data.length} contacts (filtered from ${rows.length})`)
          if (data.length > 0) {
            await db.insert(contacts).values(data)
            totalImported += data.length
            console.log(`[run-complete] insert OK`)
          } else {
            console.warn(`[run-complete] 0 contacts after filter — rows had keys: ${JSON.stringify(Object.keys(rows[0] ?? {}))}`)
          }
        } catch (err) {
          const msg = `${filename}: ${err instanceof Error ? err.message : String(err)}`
          console.error(`[run-complete] EXCEPTION file=${msg}`, err)
          importErrors.push(msg)
        }
      }

      if (importErrors.length > 0) {
        const errSuffix = `Import błędy: ${importErrors.join('; ')}`
        await db.update(runs).set({ errorMessage: errSuffix }).where(eq(runs.id, runId))
      }
      console.log(`[run-complete] DONE — imported=${totalImported} errors=${importErrors.length}`)
    }
  }

  return NextResponse.json({ ok: true })
}
