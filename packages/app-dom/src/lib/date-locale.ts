import type { Locale } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'

const DATE_LOCALE_MAP: Record<string, Locale> = {
  en: enUS,
  zh: zhCN,
}

export function getDateLocale(lang: string): Locale {
  return DATE_LOCALE_MAP[lang] ?? enUS
}
