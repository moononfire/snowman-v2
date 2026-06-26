'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useLocale, useT } from '@/lib/i18n/context'
import { LOCALE_LABELS, type Locale } from '@/lib/i18n'

export function LanguageSelector() {
  const locale = useLocale()
  const t = useT()
  const router = useRouter()
  const [value, setValue] = useState<Locale>(locale)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Locale
    setValue(next)
    startTransition(async () => {
      await fetch('/api/locale', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      })
      router.refresh()
    })
  }

  return (
    <div className="rounded-lg border p-6" style={{ background: 'var(--card)' }}>
      <h2 className="font-semibold mb-4">{t('settingsLanguage')}</h2>
      <label className="block text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>
        {t('settingsLanguageLabel')}
      </label>
      <select
        value={value}
        onChange={handleChange}
        disabled={isPending}
        className="w-full border rounded px-3 py-2 text-sm disabled:opacity-50"
        style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
      >
        {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
