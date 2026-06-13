'use client'

import { useEffect, useState } from 'react'

type VpsFile = {
  name: string
  sizeBytes: number
  modifiedAt: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function FilesPage() {
  const [files, setFiles] = useState<VpsFile[]>([])
  const [loading, setLoading] = useState(true)

  async function loadFiles() {
    setLoading(true)
    const res = await fetch('/api/files')
    if (res.ok) setFiles(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadFiles() }, [])

  async function deleteFile(name: string) {
    if (!confirm(`Usunąć plik ${name}?`)) return
    await fetch(`/api/files/${encodeURIComponent(name)}`, { method: 'DELETE' })
    loadFiles()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pliki</h1>
        <button onClick={loadFiles} className="text-sm hover:underline" style={{ color: 'var(--muted-foreground)' }}>Odśwież</button>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ background: 'var(--card)' }}>
        {loading ? (
          <div className="p-8 text-center" style={{ color: 'var(--muted-foreground)' }}>Ładowanie...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Nazwa pliku</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Rozmiar</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Zmodyfikowany</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.name} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3 font-mono">{f.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>{formatBytes(f.sizeBytes)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>
                    {new Date(f.modifiedAt).toLocaleString('pl')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <a
                        href={`/api/files/${encodeURIComponent(f.name)}`}
                        className="text-blue-500 hover:underline text-xs"
                      >
                        Pobierz
                      </a>
                      <button
                        onClick={() => deleteFile(f.name)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Usuń
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>Brak plików</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
