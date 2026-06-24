export type CallStatus = 'NOT_CALLED' | 'INTERESTED' | 'NOT_INTERESTED' | 'NO_ANSWER' | 'CALLBACK' | 'VOICEMAIL' | 'WRONG_NUMBER' | 'NOT_RELEVANT'
export type ContactSource = 'MANUAL' | 'CSV_IMPORT' | 'GOOGLE_SCRAPE'

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  MANUAL: 'Ręczny',
  CSV_IMPORT: 'CSV',
  GOOGLE_SCRAPE: 'Google',
}

export const CONTACT_SOURCE_COLORS: Record<ContactSource, string> = {
  MANUAL: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  CSV_IMPORT: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
  GOOGLE_SCRAPE: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400',
}

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  NOT_CALLED: 'Nie zadzwoniono',
  INTERESTED: 'Zainteresowany',
  NOT_INTERESTED: 'Niezainteresowany',
  NO_ANSWER: 'Brak odpowiedzi',
  CALLBACK: 'Oddzwonienie',
  VOICEMAIL: 'Poczta głosowa',
  WRONG_NUMBER: 'Zły numer',
  NOT_RELEVANT: 'Nieodpowiedni',
}

export const CALL_STATUS_COLORS: Record<CallStatus, string> = {
  NOT_CALLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  INTERESTED: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  NOT_INTERESTED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  NO_ANSWER: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
  CALLBACK: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  VOICEMAIL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
  WRONG_NUMBER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  NOT_RELEVANT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
}

export const CALL_STATUS_ORDER: CallStatus[] = [
  'INTERESTED',
  'CALLBACK',
  'NO_ANSWER',
  'VOICEMAIL',
  'NOT_INTERESTED',
  'NOT_RELEVANT',
  'WRONG_NUMBER',
]
