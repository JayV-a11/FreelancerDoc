import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from './locales'

async function loadMessages(locale: Locale) {
  switch (locale) {
    case 'en':
      return (await import('./messages/en.json')).default
    case 'es':
      return (await import('./messages/es.json')).default
    default:
      return (await import('./messages/pt-br.json')).default
  }
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value
  const locale: Locale =
    raw && (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(raw)
      ? (raw as Locale)
      : DEFAULT_LOCALE

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
