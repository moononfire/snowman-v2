import Link from 'next/link'
import { LogoutButton } from './LogoutButton'
import { SidebarNav } from '@/components/SidebarNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      <aside
        className="w-60 flex-shrink-0 flex flex-col"
        style={{
          background: 'var(--card)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold group-hover:opacity-80 transition-opacity"
              style={{ background: 'var(--accent)' }}
            >
              S
            </div>
            <span className="font-semibold text-base tracking-tight group-hover:opacity-80 transition-opacity" style={{ color: 'var(--foreground)' }}>
              Snowman 2
            </span>
          </Link>
        </div>

        <SidebarNav />

        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto" style={{ color: 'var(--foreground)' }}>
        {children}
      </main>
    </div>
  )
}
