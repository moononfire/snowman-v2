'use client'

import { createContext, useContext } from 'react'
import { type Locale, type TranslationKey, t as translate, getLocaleForDates } from '.'

const LocaleContext = createContext<Locale>('pl')

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>
}

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useT() {
  const locale = useContext(LocaleContext)
  return (key: TranslationKey) => translate(locale, key)
}

export function useDateLocale(): string {
  const locale = useContext(LocaleContext)
  return getLocaleForDates(locale)
}
