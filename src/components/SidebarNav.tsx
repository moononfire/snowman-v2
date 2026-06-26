'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Play, Megaphone, Users, List, FolderOpen, Settings, type LucideIcon } from 'lucide-react'
import { useT } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n'

type NavLink = { href: string; labelKey: TranslationKey; icon: LucideIcon }

const mainLinks: NavLink[] = [
  { href: '/dashboard/campaigns', labelKey: 'sidebarCampaigns', icon: Megaphone },
  { href: '/dashboard/contacts', labelKey: 'sidebarContacts', icon: Users },
  { href: '/dashboard/lists', labelKey: 'sidebarCallLists', icon: List },
]

const bottomLinks: NavLink[] = [
  { href: '/dashboard/runs', labelKey: 'sidebarRuns', icon: Play },
  { href: '/dashboard/files', labelKey: 'sidebarFiles', icon: FolderOpen },
  { href: '/dashboard/settings', labelKey: 'sidebarSettings', icon: Settings },
]

function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname()
  const t = useT()

  return (
    <>
      {links.map(({ href, labelKey, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${isActive ? 'nav-link-active' : ''}`}
          >
            <Icon size={18} className="opacity-70 flex-shrink-0" />
            {t(labelKey)}
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
