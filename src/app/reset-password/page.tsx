'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { token } = use(searchParams)
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const tokenStr = typeof token === 'string' ? token : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenStr, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Błąd serwera')
        return
      }

      router.push('/login')
    } catch {
      setError('Błąd serwera, spróbuj ponownie')
    } finally {
      setPending(false)
    }
  }

  if (!tokenStr) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="p-8 rounded-lg shadow w-full max-w-sm text-center border" style={{ background: 'var(--card)' }}>
          <p className="mb-4" style={{ color: 'var(--muted-foreground)' }}>Nieprawidłowy link resetujący.</p>
          <Link href="/forgot-password" className="text-blue-600 hover:underline text-sm">Wyślij nowy link</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="p-8 rounded-lg shadow w-full max-w-sm border" style={{ background: 'var(--card)' }}>
        <h1 className="text-2xl font-bold mb-6 text-center">Nowe hasło</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Nowe hasło</label>
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
            {pending ? 'Zapisywanie...' : 'Ustaw nowe hasło'}
          </button>
        </form>
      </div>
    </div>
  )
}
