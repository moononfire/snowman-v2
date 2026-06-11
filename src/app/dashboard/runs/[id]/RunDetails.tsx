'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

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
        <Link href="/dashboard/runs" className="text-sm text-gray-500 hover:underline">← Runy</Link>
        <h1 className="text-2xl font-bold font-mono">{run.script}</h1>
        <span className={`text-sm px-2 py-0.5 rounded-full ${STATUS_COLORS[run.status] ?? ''}`}>
          {run.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-4 space-y-2">
          <h2 className="font-semibold mb-3">Parametry</h2>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
            {JSON.stringify(run.params, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Pliki wynikowe</h2>
          {outputFiles.length === 0 ? (
            <p className="text-gray-400 text-sm">Brak plików</p>
          ) : (
            <ul className="space-y-1">
              {outputFiles.map((f) => (
                <li key={f}>
                  <a
                    href={`/api/files/${encodeURIComponent(f)}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {f}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {run.errorMessage && (
            <p className="text-red-600 text-sm mt-3">{run.errorMessage}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-3">Logi</h2>
        <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">
          {logs || 'Brak logów'}
        </pre>
      </div>
    </div>
  )
}
