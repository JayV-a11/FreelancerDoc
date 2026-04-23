export const SUPPORTED_LOCALES = ['pt-br', 'en', 'es'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pt-br'

export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-br': 'Português',
  en: 'English',
  es: 'Español',
}
