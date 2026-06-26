import pl from './pl'
import en from './en'
import de from './de'

export type Locale = 'pl' | 'en' | 'de'
export type TranslationKey = keyof typeof pl

type Dictionary = Record<TranslationKey, string>

const dictionaries: Record<Locale, Dictionary> = { pl, en, de }

export const LOCALE_LABELS: Record<Locale, string> = {
  pl: 'Polski',
  en: 'English',
  de: 'Deutsch',
}

export function t(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale]?.[key] ?? dictionaries.pl[key] ?? key
}

export function getLocaleForDates(locale: Locale): string {
  return locale === 'pl' ? 'pl-PL' : locale === 'de' ? 'de-DE' : 'en-US'
}
