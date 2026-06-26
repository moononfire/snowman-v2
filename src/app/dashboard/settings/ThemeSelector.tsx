'use client'

import { useTheme } from '@/components/ThemeProvider'
import { useT } from '@/lib/i18n/context'
import type { Theme } from '@/components/ThemeProvider'

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const t = useT()

  return (
    <div className="rounded-lg border p-6" style={{ background: 'var(--card)' }}>
      <h2 className="font-semibold mb-4">{t('settingsTheme')}</h2>
      <label className="block text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>
        {t('settingsThemeLabel')}
      </label>
      <select
        value={theme}
        onChange={e => setTheme(e.target.value as Theme)}
        className="w-full border rounded px-3 py-2 text-sm"
        style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
      >
        <option value="light">{t('settingsThemeLight')}</option>
        <option value="dark">{t('settingsThemeDark')}</option>
      </select>
    </div>
  )
}
