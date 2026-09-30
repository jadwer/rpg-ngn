'use client'

import { LANGUAGES, language, normalizeLanguage, onLanguageChange, pickLanguage, setLanguage, type Language } from '@rpg-ngn/i18n'
import { createContext, Fragment, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * El idioma de la interfaz en la web (i18n). Se elige asi: `?lang=` en la URL,
 * lo que la persona escogio en este navegador, o el idioma del navegador, o español. Los textos
 * salen de `@rpg-ngn/i18n` con `t()`; al cambiar de idioma se vuelve a montar
 * lo de adentro para que todo se repinte (cambiar de idioma es raro).
 */
const STORAGE_KEY = 'rpg:lang'

interface LanguageState {
  lang: Language
  choose: (l: Language) => void
  languages: readonly Language[]
}

const LanguageContext = createContext<LanguageState>({ lang: 'es', choose: () => undefined, languages: LANGUAGES })

function stored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function remember(l: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, l)
  } catch {
    // Sin almacenamiento (modo privado): vale para esta visita.
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(language())

  useEffect(() => {
    const off = onLanguageChange(setLang)
    // `?lang=en` en un enlace (las demos para quien no habla español) manda y
    // se recuerda, como si lo hubiera elegido en el selector.
    const fromUrl = normalizeLanguage(new URLSearchParams(window.location.search).get('lang'))
    if (fromUrl) remember(fromUrl)
    setLanguage(fromUrl ?? pickLanguage([stored(), ...(navigator.languages ?? []), navigator.language]))
    return off
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const choose = useCallback((l: Language) => {
    remember(l)
    setLanguage(l)
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, choose, languages: LANGUAGES }}>
      <Fragment key={lang}>{children}</Fragment>
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageState {
  return useContext(LanguageContext)
}
