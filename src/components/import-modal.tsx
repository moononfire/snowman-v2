'use client'

import { useState, useRef } from 'react'
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'

const FIELD_MAP: Record<string, string> = {
  imie: 'firstName', 'imię': 'firstName',
  first_name: 'firstName', firstname: 'firstName', name: 'firstName',
  nazwisko: 'lastName', last_name: 'lastName', lastname: 'lastName',
  telefon: 'phone', tel: 'phone', phone: 'phone', mobile: 'phone', 'komórka': 'phone',
  firma: 'company', company: 'company',
  stanowisko: 'position', position: 'position', 'job title': 'position',
  email: 'email', mail: 'email',
  notatka: 'preCallNote', note: 'preCallNote', notes: 'preCallNote',
  tagi: 'tags', tags: 'tags',
}

export function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [mapped, setMapped] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data as Record<string, string>[]
        const normalised = rows.map((row) => {
          const out: Record<string, string> = {}
          for (const [k, v] of Object.entries(row)) {
            const mappedKey = FIELD_MAP[k.toLowerCase().trim()] ?? k.toLowerCase().trim()
            out[mappedKey] = v
          }
          return out
        })
        setPreview(rows.slice(0, 3))
        setMapped(normalised)
        setError('')
      },
      error: () => setError('Nie mogę odczytać pliku CSV'),
    })
  }

  async function doImport() {
    if (!mapped.length) return
    setImporting(true)
    const res = await fetch('/api/contacts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: mapped }),
    })
    const data = await res.json()
    setImporting(false)
    if (res.ok) {
      setResult(data)
    } else {
      setError(data.error ?? 'Błąd importu')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Import CSV</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {result ? (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-green-700 dark:text-green-400 font-medium">Zaimportowano {result.created} kontaktów</p>
            </div>
          ) : (
            <>
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Przeciągnij plik CSV lub <span className="text-blue-600">kliknij, żeby wybrać</span></p>
                <p className="text-xs text-muted-foreground mt-1">Nagłówki: imię, telefon, nazwisko, firma, stanowisko, email, notatka...</p>
                <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {preview.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Podgląd ({mapped.length} wierszy):</p>
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="text-xs w-full">
                      <thead className="bg-muted">
                        <tr>
                          {Object.keys(preview[0]).map((k) => (
                            <th key={k} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {preview.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-2 py-1.5 text-foreground whitespace-nowrap max-w-[120px] truncate">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          {result ? (
            <Button onClick={onImported}>Gotowe</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Anuluj</Button>
              <Button onClick={doImport} disabled={!mapped.length || importing}>
                {importing ? 'Importowanie...' : `Importuj ${mapped.length} kontaktów`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
