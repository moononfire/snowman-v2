'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewGoogleScrapeButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [maxResults, setMaxResults] = useState('100')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: 'scrape_google_maps',
          params: { query, max_results: maxResults },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Błąd serwera')
      }
      const { runId } = await res.json()
      setOpen(false)
      setQuery('')
      router.push(`/dashboard/runs/${runId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
      >
        + Nowy scraping Google
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Nowy scraping Google Maps</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fraza wyszukiwania</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="np. restauracje Warszawa Śródmieście"
                  required
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maks. wyników</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxResults}
                  onChange={(e) => setMaxResults(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Uruchamianie...' : 'Uruchom'}
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setError('') }}
                  className="px-4 py-2 rounded text-sm border hover:bg-gray-50"
                >
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
