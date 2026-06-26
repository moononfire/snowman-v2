export const dynamic = 'force-dynamic'

import { db } from '@/db'
import { clients } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { type Locale, t } from '@/lib/i18n'
import { PasswordForm } from './PasswordForm'
import { SmtpForm } from './SmtpForm'
import { LanguageSelector } from './LanguageSelector'
import { IgnoredPatternsForm } from './IgnoredPatternsForm'
import { ThemeSelector } from './ThemeSelector'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const clientRows = await db.select().from(clients).where(eq(clients.id, session.clientId)).limit(1)
  const client = clientRows[0]

  const config = client?.config as Record<string, unknown> | null
  const stored = config?.locale as string | undefined
  const locale: Locale = stored === 'en' || stored === 'de' ? stored : 'pl'
  const ignoredPatterns = (config?.ignoredEmailPatterns as string[] | undefined) ?? []

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t(locale, 'settingsTitle')}</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border p-6" style={{ background: 'var(--card)' }}>
          <h2 className="font-semibold mb-4">{t(locale, 'settingsClientData')}</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt style={{ color: 'var(--muted-foreground)' }}>{t(locale, 'settingsSlug')}</dt>
              <dd className="font-mono mt-0.5">{client?.slug}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--muted-foreground)' }}>{t(locale, 'settingsName')}</dt>
              <dd className="mt-0.5">{client?.name}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--muted-foreground)' }}>{t(locale, 'settingsEmail')}</dt>
              <dd className="mt-0.5">{client?.email ?? '—'}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--muted-foreground)' }}>{t(locale, 'settingsStatus')}</dt>
              <dd className="mt-0.5">{client?.status}</dd>
            </div>
          </dl>
        </div>

        <PasswordForm />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <SmtpForm
          initial={{
            email: (client?.config as Record<string, { email?: string; appPassword?: string }> | null)?.smtp?.email ?? '',
            appPassword: (client?.config as Record<string, { email?: string; appPassword?: string }> | null)?.smtp?.appPassword ?? '',
          }}
        />
        <LanguageSelector />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <ThemeSelector />
      </div>

      <div className="mt-6">
        <IgnoredPatternsForm initial={ignoredPatterns} />
      </div>
    </div>
  )
}
