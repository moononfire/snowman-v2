export const dynamic = 'force-dynamic'

import { db } from '@/db'
import { clients } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { PasswordForm } from './PasswordForm'
import { SmtpForm } from './SmtpForm'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const clientRows = await db.select().from(clients).where(eq(clients.id, session.clientId)).limit(1)
  const client = clientRows[0]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ustawienia</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border p-6" style={{ background: 'var(--card)' }}>
          <h2 className="font-semibold mb-4">Dane klienta</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt style={{ color: 'var(--muted-foreground)' }}>Slug</dt>
              <dd className="font-mono mt-0.5">{client?.slug}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--muted-foreground)' }}>Nazwa</dt>
              <dd className="mt-0.5">{client?.name}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--muted-foreground)' }}>Email</dt>
              <dd className="mt-0.5">{client?.email ?? '—'}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--muted-foreground)' }}>Status</dt>
              <dd className="mt-0.5">{client?.status}</dd>
            </div>
          </dl>
        </div>

        <PasswordForm />
      </div>

      <div className="mt-6">
        <SmtpForm
          initial={{
            email: (client?.config as Record<string, { email?: string; appPassword?: string }> | null)?.smtp?.email ?? '',
            appPassword: (client?.config as Record<string, { email?: string; appPassword?: string }> | null)?.smtp?.appPassword ?? '',
          }}
        />
      </div>
    </div>
  )
}
