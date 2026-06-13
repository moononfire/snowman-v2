'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="p-8 rounded-lg shadow w-full max-w-sm border" style={{ background: 'var(--card)' }}>
        <h1 className="text-2xl font-bold mb-6 text-center">Logowanie</h1>
        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Slug klienta</label>
            <input
              name="slug"
              type="text"
              required
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
              placeholder="firma-xyz"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Hasło</label>
            <input
              name="password"
              type="password"
              required
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
            />
          </div>
          {state?.error && (
            <p className="text-red-600 text-sm">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? 'Logowanie...' : 'Zaloguj się'}
          </button>
          <div className="text-center">
            <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">Zapomniałem hasła</a>
          </div>
        </form>
      </div>
    </div>
  )
}
