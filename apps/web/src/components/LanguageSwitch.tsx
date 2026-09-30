'use client'

import type { ApiClient } from '@rpg-ngn/api-client'
import { t, type Language } from '@rpg-ngn/i18n'
import { useLanguage } from '../lib/i18n'

/**
 * Elegir el idioma de la interfaz (i18n). Vale para este navegador; con
 * sesion tambien se guarda en la cuenta, para que los correos lleguen en ese
 * idioma. El nombre de cada idioma va en su propio idioma.
 */
export function LanguageSwitch({ client, compact = false }: { client?: ApiClient | null; compact?: boolean }) {
  const { lang, choose, languages } = useLanguage()

  const pick = (l: Language) => {
    if (l === lang) return
    choose(l)
    // La cuenta guarda la preferencia; si falla, el navegador ya la recuerda.
    client?.updateProfile({ locale: l }).catch(() => undefined)
  }

  return (
    <div className={`segmented language-switch${compact ? ' small' : ''}`} role="group" aria-label={t('common.language')}>
      {languages.map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} lang={l} aria-label={t(`common.languages.${l}`)} onClick={() => pick(l)}>
          {compact ? l.toUpperCase() : t(`common.languages.${l}`)}
        </button>
      ))}
    </div>
  )
}
