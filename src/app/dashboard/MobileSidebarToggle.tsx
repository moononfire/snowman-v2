'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { SidebarNav } from '@/components/SidebarNav'
import { LogoutButton } from './LogoutButton'

export function MobileSidebarToggle({ clientSlug }: { clientSlug?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-60 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}
      >
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Link href="/dashboard/campaigns" className="flex items-center gap-3 group" onClick={() => setOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/snowman.svg" alt="Snowman" className="w-8 h-8 rounded-lg flex-shrink-0" />
            <span className="font-semibold text-base tracking-tight" style={{ color: 'var(--foreground)' }}>
              Snowman Prospecting
            </span>
          </Link>
        </div>

        <div onClick={() => setOpen(false)} className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>

        <div className="px-3 py-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          {clientSlug && (
            <p className="px-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Zalogowany jako <span className="font-semibold">{clientSlug}</span>
            </p>
          )}
          <LogoutButton />
        </div>
      </aside>
    </>
  )
}
