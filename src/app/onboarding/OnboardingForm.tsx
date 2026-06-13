'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function slugFromEmail(email: string) {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 20)
}

export default function OnboardingForm({ sessionId, email }: { sessionId: string; email: string }) {
  const router = useRouter()
  const [slug, setSlug] = useState(() => slugFromEmail(email))
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!/^[a-z0-9-]{3,30}$/.test(slug)) {
      setError('Slug może zawierać tylko małe litery, cyfry i myślniki (3–30 znaków)')
      return
    }
    if (password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków')
      return
    }
    if (password !== passwordConfirm) {
      setError('Hasła nie są zgodne')
      return
    }

    setPending(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, slug, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.alreadyActivated) {
          setError('Konto już zostało aktywowane — przejdź do logowania')
        } else if (data.slugTaken) {
          setError('Ta nazwa jest już zajęta, wybierz inną')
        } else {
          setError(data.error ?? 'Błąd serwera, spróbuj ponownie')
        }
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Błąd serwera, spróbuj ponownie')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
          Nazwa konta (slug)
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
          placeholder="moja-firma"
        />
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Tylko małe litery, cyfry i myślniki (3–30 znaków). Nie można zmienić po aktywacji.</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Hasło</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Powtórz hasło</label>
        <input
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? 'Aktywowanie...' : 'Aktywuj konto'}
      </button>
    </form>
  )
}
