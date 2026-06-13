'use client'

import { useActionState } from 'react'
import { changePasswordAction } from './actions'

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined)

  return (
    <div className="rounded-lg border p-6" style={{ background: 'var(--card)' }}>
      <h2 className="font-semibold mb-4">Zmień hasło</h2>
      <form action={action} className="space-y-3">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--muted-foreground)' }}>Aktualne hasło</label>
          <input name="current" type="password" required className="w-full border rounded px-3 py-2 text-sm" style={{ background: 'var(--muted)', color: 'var(--foreground)' }} />
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--muted-foreground)' }}>Nowe hasło</label>
          <input name="next" type="password" required className="w-full border rounded px-3 py-2 text-sm" style={{ background: 'var(--muted)', color: 'var(--foreground)' }} />
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--muted-foreground)' }}>Potwierdź hasło</label>
          <input name="confirm" type="password" required className="w-full border rounded px-3 py-2 text-sm" style={{ background: 'var(--muted)', color: 'var(--foreground)' }} />
        </div>
        {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
        {state?.success && <p className="text-green-500 text-sm">Hasło zmienione</p>}
        <button type="submit" disabled={pending} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
          {pending ? 'Zapisywanie...' : 'Zmień hasło'}
        </button>
      </form>
    </div>
  )
}
