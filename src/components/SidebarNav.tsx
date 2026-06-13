'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, UserPlus, Megaphone, Users, List, FolderOpen, Settings, type LucideIcon } from 'lucide-react'

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/runs', label: 'Pozyskaj kontakty', icon: UserPlus },
  { href: '/dashboard/campaigns', label: 'Kampanie', icon: Megaphone },
  { href: '/dashboard/contacts', label: 'Kontakty', icon: Users },
  { href: '/dashboard/lists', label: 'Listy call', icon: List },
  { href: '/dashboard/files', label: 'Pliki', icon: FolderOpen },
  { href: '/dashboard/settings', label: 'Ustawienia', icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${isActive ? 'nav-link-active' : ''}`}
          >
            <Icon size={18} className="opacity-70 flex-shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
