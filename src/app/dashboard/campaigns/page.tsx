'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Campaign = {
  id: string
  name: string
  status: string
  script: string
  config: Record<string, unknown>
  lastRunId: string | null
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-purple-100 text-purple-800',
  running: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [script, setScript] = useState('send_campaign')
  const [submitting, setSubmitting] = useState(false)

  async function loadCampaigns() {
    const res = await fetch('/api/campaigns')
    if (res.ok) setCampaigns(await res.json())
  }

  useEffect(() => { loadCampaigns() }, [])

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, script, config: {} }),
    })
    setName('')
    setShowForm(false)
    setSubmitting(false)
    loadCampaigns()
  }

  async function runCampaign(id: string) {
    await fetch(`/api/campaigns/${id}/run`, { method: 'POST' })
    loadCampaigns()
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Usunąć kampanię?')) return
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    loadCampaigns()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kampanie</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + Nowa kampania
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-3">Nowa kampania</h2>
          <form onSubmit={createCampaign} className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nazwa kampanii"
              required
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <input
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Skrypt (np. send_campaign)"
              required
              className="w-full border rounded px-3 py-2 text-sm font-mono"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
                {submitting ? 'Tworzenie...' : 'Utwórz'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-sm border">
                Anuluj
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-2 font-medium text-gray-600">Nazwa</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Skrypt</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 font-mono text-gray-600">{c.script}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? ''}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {c.lastRunId && (
                      <Link href={`/dashboard/runs/${c.lastRunId}`} className="text-blue-600 hover:underline text-xs">
                        Ostatni run
                      </Link>
                    )}
                    <button
                      onClick={() => runCampaign(c.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                    >
                      Uruchom
                    </button>
                    <button
                      onClick={() => deleteCampaign(c.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Usuń
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Brak kampanii</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
