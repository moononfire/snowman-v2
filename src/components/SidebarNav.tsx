'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Play, Megaphone, Users, List, FolderOpen, Settings, type LucideIcon } from 'lucide-react'

type NavLink = { href: string; label: string; icon: LucideIcon }

const mainLinks: NavLink[] = [
  { href: '/dashboard/campaigns', label: 'Kampanie', icon: Megaphone },
  { href: '/dashboard/contacts', label: 'Kontakty', icon: Users },
  { href: '/dashboard/lists', label: 'Listy call', icon: List },
]

const bottomLinks: NavLink[] = [
  { href: '/dashboard/runs', label: 'Runy', icon: Play },
  { href: '/dashboard/files', label: 'Pliki', icon: FolderOpen },
  { href: '/dashboard/settings', label: 'Ustawienia', icon: Settings },
]

function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname()

  return (
    <>
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
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
    </>
  )
}

export function SidebarNav() {
  return (
    <nav className="flex-1 flex flex-col px-3 py-4">
      <div className="space-y-0.5">
        <NavLinks links={mainLinks} />
      </div>
      <div className="mt-auto space-y-0.5">
        <NavLinks links={bottomLinks} />
      </div>
    </nav>
  )
}
