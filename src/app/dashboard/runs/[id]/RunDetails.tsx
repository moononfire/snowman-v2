'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/context'

type Run = {
  id: string
  script: string
  status: string
  params: unknown
  outputFiles: unknown
  errorMessage: string | null
  startedAt: Date | string | null
  finishedAt: Date | string | null
  createdAt: Date | string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
}

export function RunDetails({ initialRun }: { initialRun: Run }) {
  const t = useT()
  const [run, setRun] = useState(initialRun)
  const [logs, setLogs] = useState('')

  const fetchRun = useCallback(async () => {
    const res = await fetch(`/api/runs/${initialRun.id}`)
    if (res.ok) setRun(await res.json())
  }, [initialRun.id])

  const fetchLogs = useCallback(async () => {
    const res = await fetch(`/api/runs/${initialRun.id}/logs?tail=200`)
    if (res.ok) setLogs(await res.text())
  }, [initialRun.id])

  useEffect(() => {
    if (run.status === 'pending' || run.status === 'running') {
      const interval = setInterval(() => {
        fetchRun()
        fetchLogs()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [run.status, fetchRun, fetchLogs])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const outputFiles = Array.isArray(run.outputFiles) ? run.outputFiles as string[] : []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/runs" className="text-sm hover:underline" style={{ color: 'var(--muted-foreground)' }}>{t('runsBack')}</Link>
        <h1 className="text-2xl font-bold font-mono">{run.script}</h1>
        <span className={`text-sm px-2 py-0.5 rounded-full ${STATUS_COLORS[run.status] ?? ''}`}>
          {run.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg border p-4 space-y-2" style={{ background: 'var(--card)' }}>
          <h2 className="font-semibold mb-3">{t('runParameters')}</h2>
          <pre className="text-xs p-3 rounded overflow-auto" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
            {JSON.stringify(run.params, null, 2)}
          </pre>
        </div>

        <div className="rounded-lg border p-4" style={{ background: 'var(--card)' }}>
          <h2 className="font-semibold mb-3">{t('runOutputFiles')}</h2>
          {outputFiles.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{t('runNoFiles')}</p>
          ) : (
            <ul className="space-y-1">
              {outputFiles.map((f) => (
                <li key={f}>
                  <a
                    href={`/api/files/${encodeURIComponent(f)}`}
                    className="text-blue-500 hover:underline text-sm"
                  >
                    {f}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {run.errorMessage && (
            <p className="text-red-500 text-sm mt-3">{run.errorMessage}</p>
          )}
        </div>
      </div>

      {run.script === 'scrape_contact_emails' && run.status === 'done' && !run.errorMessage && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-green-800 dark:text-green-300 font-medium">
            Emaile zaktualizowane w kontaktach.
          </span>
          <a
            href="/dashboard/contacts"
            className="text-sm text-green-700 dark:text-green-400 underline hover:no-underline font-medium"
          >
            Idź do kontaktów →
          </a>
        </div>
      )}

      <div className="rounded-lg border p-4" style={{ background: 'var(--card)' }}>
        <h2 className="font-semibold mb-3">{t('runLogs')}</h2>
        <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">
          {logs || t('runNoLogs')}
        </pre>
      </div>
    </div>
  )
}
