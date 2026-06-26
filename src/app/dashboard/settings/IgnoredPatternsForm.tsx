'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { saveIgnoredPatternsAction } from './actions'

export function IgnoredPatternsForm({ initial }: { initial: string[] }) {
  const [patterns, setPatterns] = useState<string[]>(initial)
  const [input, setInput] = useState('')
  const [state, setState] = useState<'idle' | 'saved' | 'error'>('idle')

  function add() {
    const v = input.trim()
    if (!v || patterns.includes(v)) { setInput(''); return }
    setPatterns((p) => [...p, v])
    setInput('')
  }

  function remove(p: string) {
    setPatterns((prev) => prev.filter((x) => x !== p))
  }

  async function save() {
    const res = await saveIgnoredPatternsAction(patterns)
    setState(res.success ? 'saved' : 'error')
    setTimeout(() => setState('idle'), 3000)
  }

  return (
    <div className="rounded-lg border p-6" style={{ background: 'var(--card)' }}>
      <h2 className="font-semibold mb-1">Ignorowane wzorce emaili</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
        Emaile pasujące do tych wzorców nie będą zbierane podczas scrapowania.
        Np. <code className="font-mono">@example.com</code>, <code className="font-mono">noreply@</code>, <code className="font-mono">admin@firma.pl</code>
      </p>

      <div className="flex gap-2 mb-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="@domain.com lub noreply@"
          className="text-sm"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <Button variant="outline" onClick={add} type="button">Dodaj</Button>
      </div>

      {patterns.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {patterns.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono border" style={{ background: 'var(--muted)' }}>
              {p}
              <button onClick={() => remove(p)} className="hover:text-red-500 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>Brak wzorców — zbierane są wszystkie emaile.</p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} size="sm">Zapisz</Button>
        {state === 'saved' && <span className="text-xs text-green-600">Zapisano</span>}
        {state === 'error' && <span className="text-xs text-red-600">Błąd zapisu</span>}
      </div>
    </div>
  )
}
