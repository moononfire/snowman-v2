'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } finally {
      setPending(false)
      setSubmitted(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="p-8 rounded-lg shadow w-full max-w-sm border" style={{ background: 'var(--card)' }}>
        <h1 className="text-2xl font-bold mb-6 text-center">Resetuj hasło</h1>
        {submitted ? (
          <div className="text-center">
            <p className="mb-4" style={{ color: 'var(--foreground)' }}>Jeśli ten email istnieje w systemie, wysłaliśmy link resetujący.</p>
            <Link href="/login" className="text-blue-600 hover:underline text-sm">Wróć do logowania</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                placeholder="adres@firma.pl"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? 'Wysyłanie...' : 'Wyślij link resetujący'}
            </button>
            <div className="text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:underline">Wróć do logowania</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
