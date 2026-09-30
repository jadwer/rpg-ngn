import { normalizeLanguage, type Language } from '@rpg-ngn/i18n'

/**
 * Idioma de una mesa (`settings.language` de la API): en el que narra el GM
 * y en el que se piden los textos del pack. Una mesa sin idioma es de antes
 * de i18n, y todas esas se jugaban en español.
 */
export function tableLanguageOf(settings: Record<string, unknown> | null | undefined): Language {
  const value = settings?.['language']
  return normalizeLanguage(typeof value === 'string' ? value : null) ?? 'es'
}
