'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveSmtpConfigAction, testSmtpConnectionAction } from './actions'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type SmtpConfig = {
  email: string
  appPassword: string
}

export function SmtpForm({ initial }: { initial: SmtpConfig }) {
  const [form, setForm] = useState(initial)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const [testState, setTestState] = useState<'idle' | 'ok' | 'error'>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const set = (k: keyof SmtpConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  function save() {
    startTransition(async () => {
      const res = await saveSmtpConfigAction(form)
      setSaveState(res.success ? 'saved' : 'error')
      setTimeout(() => setSaveState('idle'), 3000)
    })
  }

  function test() {
    setTestState('idle')
    setTestMsg('')
    startTransition(async () => {
      const res = await testSmtpConnectionAction(form)
      setTestState(res.success ? 'ok' : 'error')
      setTestMsg(res.message ?? '')
    })
  }

  return (
    <div className="rounded-lg border p-6" style={{ background: 'var(--card)' }}>
      <h2 className="font-semibold mb-1">Email (Gmail)</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Połącz swoje konto Gmail, żeby wysyłać i odbierać maile z aplikacji.{' '}
        <a
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Wygeneruj hasło aplikacji →
        </a>
      </p>

      <div className="space-y-3">
        <div>
          <Label>Adres Gmail</Label>
          <Input
            value={form.email}
            onChange={set('email')}
            className="mt-1"
            type="email"
            placeholder="twoj@gmail.com"
          />
        </div>
        <div>
          <Label>Hasło aplikacji</Label>
          <Input
            value={form.appPassword}
            onChange={set('appPassword')}
            className="mt-1"
            type="password"
            placeholder="xxxx xxxx xxxx xxxx"
          />
          <p className="text-xs text-muted-foreground mt-1">
            16-znakowe hasło z Google Account → Security → App Passwords
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} disabled={isPending || !form.email || !form.appPassword}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Zapisz
          </Button>
          <Button
            variant="outline"
            onClick={test}
            disabled={isPending || !form.email || !form.appPassword}
          >
            Testuj połączenie
          </Button>

          {saveState === 'saved' && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Zapisano
            </span>
          )}
          {saveState === 'error' && (
            <span className="flex items-center gap-1 text-sm text-red-600">
              <XCircle className="h-4 w-4" /> Błąd zapisu
            </span>
          )}
        </div>

        {testState !== 'idle' && (
          <div className={`flex items-start gap-2 text-sm rounded-md px-3 py-2 ${testState === 'ok' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
            {testState === 'ok'
              ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            }
            <span>{testMsg || (testState === 'ok' ? 'Połączenie działa!' : 'Nie można połączyć.')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
