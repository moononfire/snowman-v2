'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

export function NavLink({ href, children, icon: Icon }: { href: string; children: React.ReactNode; icon?: LucideIcon }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${isActive ? 'nav-link-active' : ''}`}
    >
      {Icon && <Icon size={18} className="opacity-70 flex-shrink-0" />}
      {children}
    </Link>
  )
}
