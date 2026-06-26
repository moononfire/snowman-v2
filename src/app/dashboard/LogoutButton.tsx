'use client'

import { logoutAction } from './actions'
import { useT } from '@/lib/i18n/context'

export function LogoutButton() {
  const t = useT()
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="w-full text-left text-sm px-3 py-2 rounded transition-colors"
        style={{ color: 'var(--muted-foreground)' }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--muted)'
          e.currentTarget.style.color = 'var(--foreground)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = ''
          e.currentTarget.style.color = 'var(--muted-foreground)'
        }}
      >
        {t('logout')}
      </button>
    </form>
  )
}
