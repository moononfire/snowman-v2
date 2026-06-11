import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <span className="font-bold text-gray-900">Script Runner</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/dashboard/runs">Historia runów</NavLink>
          <NavLink href="/dashboard/campaigns">Kampanie</NavLink>
          <NavLink href="/dashboard/files">Pliki</NavLink>
          <NavLink href="/dashboard/settings">Ustawienia</NavLink>
        </nav>
        <div className="p-4 border-t">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </Link>
  )
}
