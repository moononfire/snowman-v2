import Link from 'next/link'
import { LogoutButton } from './LogoutButton'
import { MobileSidebarToggle } from './MobileSidebarToggle'
import { SidebarNav } from '@/components/SidebarNav'
import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { LocaleProvider } from '@/lib/i18n/context'
import { type Locale, t } from '@/lib/i18n'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  let locale: Locale = 'pl'
  if (session) {
    const rows = await db.select().from(clients).where(eq(clients.id, session.clientId)).limit(1)
    const config = rows[0]?.config as Record<string, unknown> | null
    const stored = config?.locale as string | undefined
    if (stored === 'en' || stored === 'de' || stored === 'pl') locale = stored
  }

  return (
    <LocaleProvider locale={locale}>
      <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
        {/* Desktop sidebar */}
        <aside
          className="hidden md:flex w-60 flex-shrink-0 flex-col h-screen sticky top-0"
          style={{
            background: 'var(--card)',
            borderRight: '1px solid var(--border)',
          }}
        >
          <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <Link href="/dashboard/campaigns" className="flex items-center gap-3 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/snowman.svg" alt="Snowman" className="w-8 h-8 rounded-lg group-hover:opacity-80 transition-opacity flex-shrink-0" />
              <span className="font-semibold text-base tracking-tight group-hover:opacity-80 transition-opacity" style={{ color: 'var(--foreground)' }}>
                Snowman Prospecting
              </span>
            </Link>
          </div>

          <SidebarNav />

          <div className="px-3 py-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
            {session && (
              <p className="px-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {t(locale, 'loggedAs')} <span className="font-semibold">{session.clientSlug}</span>
              </p>
            )}
            <LogoutButton />
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header bar */}
          <div
            className="md:hidden flex items-center h-12 px-3 sticky top-0 z-30 shrink-0"
            style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
          >
            <MobileSidebarToggle clientSlug={session?.clientSlug} />
            <span className="ml-3 font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
              Snowman Prospecting
            </span>
          </div>

          <main className="flex-1 p-4 md:p-8 overflow-auto" style={{ color: 'var(--foreground)' }}>
            {children}
          </main>
        </div>
      </div>
    </LocaleProvider>
  )
}
