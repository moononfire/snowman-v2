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
        <button onClick={loadFiles} className="text-sm text-gray-500 hover:underline">Odśwież</button>
      </div>

      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Ładowanie...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-600">Nazwa pliku</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Rozmiar</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Zmodyfikowany</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.name} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{f.name}</td>
                  <td className="px-4 py-3 text-gray-500">{formatBytes(f.sizeBytes)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(f.modifiedAt).toLocaleString('pl')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <a
                        href={`/api/files/${encodeURIComponent(f.name)}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Pobierz
                      </a>
                      <button
                        onClick={() => deleteFile(f.name)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Usuń
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Brak plików</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
