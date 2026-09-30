import { normalizeLanguage, t, type Language } from '@rpg-ngn/i18n'

/**
 * Idioma de una mesa (`settings.language` de la API): en el que narra el GM
 * y en el que se piden los textos del pack. Una mesa sin idioma es de antes
 * de i18n, y todas esas se jugaban en español.
 */
export function tableLanguageOf(settings: Record<string, unknown> | null | undefined): Language {
  const value = settings?.['language']
  return normalizeLanguage(typeof value === 'string' ? value : null) ?? 'es'
}

/**
 * Idiomas en que se juega un mundo (`languages` del pack, el suyo primero),
 * solo los que la interfaz conoce. Un mundo que no lo dice es en español.
 */
export function worldLanguages(world: { languages?: readonly string[] | null | undefined } | null | undefined): Language[] {
  const out: Language[] = []
  for (const code of world?.languages ?? []) {
    const l = normalizeLanguage(code)
    if (l && !out.includes(l)) out.push(l)
  }
  return out.length > 0 ? out : ['es']
}

/** Con que idioma nace una mesa: el de la interfaz si el mundo lo trae; si no, el del mundo. */
export function newTableLanguage(world: { languages?: readonly string[] | null | undefined } | null | undefined, ui: Language): Language {
  const languages = worldLanguages(world)
  return languages.includes(ui) ? ui : languages[0]!
}

/** "ES · EN", para la tarjeta del mundo. */
export function languageCodes(languages: readonly Language[]): string {
  return languages.map((l) => l.toUpperCase()).join(' · ')
}

/** El idioma por su nombre en la interfaz: "inglés" en español, "English" en ingles. */
export function languageName(l: Language): string {
  return t(`common.languageNames.${l}`)
}

/** "Solo en español" cuando el mundo no se juega en el idioma de la interfaz; null si si. */
export function worldLanguageNote(world: { languages?: readonly string[] | null | undefined } | null | undefined, ui: Language): string | null {
  const languages = worldLanguages(world)
  if (languages.includes(ui)) return null
  return t('common.onlyIn', { language: languages.map(languageName).join(', ') })
}
