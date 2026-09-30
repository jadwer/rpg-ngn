import { LANGUAGES, language, onLanguageChange, pickLanguage, setLanguage, type Language } from '@rpg-ngn/i18n'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { storage } from '../online/storage'

/**
 * El idioma de la interfaz en la app, como la web (`apps/web/src/lib/i18n.tsx`):
 * lo que se eligio en este telefono o, si nunca se eligio, el del sistema, y
 * si no es uno de los nuestros, español. Al cambiar no se vuelve a montar
 * nada (como en la web), porque se perderia la pantalla y la mesa abiertas:
 * la raiz lee `useLanguage()` y al repintarse repinta todo lo de abajo.
 */
interface LanguageState {
  lang: Language
  /** false mientras se lee el almacen: la raiz espera para no pintar en el idioma equivocado. */
  ready: boolean
  choose: (l: Language) => void
  languages: readonly Language[]
}

const LanguageContext = createContext<LanguageState>({ lang: 'es', ready: true, choose: () => undefined, languages: LANGUAGES })

/** El idioma del telefono segun Hermes (`es-MX`, `en-US`); sin dependencia nativa extra. */
function deviceLocale(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale
  } catch {
    return null
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(language())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const off = onLanguageChange(setLang)
    let alive = true
    void storage.language().then((saved) => {
      if (!alive) return
      setLanguage(pickLanguage([saved, deviceLocale()]))
      setReady(true)
    })
    return () => {
      alive = false
      off()
    }
  }, [])

  const choose = useCallback((l: Language) => {
    void storage.setLanguage(l)
    setLanguage(l)
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, ready, choose, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageState {
  return useContext(LanguageContext)
}
