import i18next from 'i18next'
import { en } from './locales/en/index.js'
import { es } from './locales/es/index.js'
import type { Paths } from './types.js'

export type { Messages, Paths } from './types.js'

/** Idiomas de la interfaz; el primero es el de respaldo. */
export const LANGUAGES = ['es', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/** Cualquier clave de texto, comprobada contra el español. */
export type MessageKey = Paths<typeof es>

const instance = i18next.createInstance()
void instance.init({
  lng: 'es',
  fallbackLng: 'es',
  resources: { es: { translation: es }, en: { translation: en } },
  interpolation: { escapeValue: false },
  initAsync: false,
  returnNull: false,
  // Sin el anuncio que i18next imprime en consola al arrancar.
  showSupportNotice: false,
})

/** El texto de una clave en el idioma actual; `{{nombre}}` se sustituye con `vars`. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  return instance.t(key, vars ?? {}) as string
}

export function language(): Language {
  return (instance.language as Language) ?? 'es'
}

/** 'en-US' -> 'en'; null si no es un idioma de la interfaz. */
export function normalizeLanguage(tag: string | null | undefined): Language | null {
  if (!tag) return null
  const base = tag.trim().toLowerCase().slice(0, 2)
  return (LANGUAGES as readonly string[]).includes(base) ? (base as Language) : null
}

/** El primero de los candidatos que la interfaz habla (cuenta, dispositivo, navegador), o español. */
export function pickLanguage(candidates: ReadonlyArray<string | null | undefined>): Language {
  for (const c of candidates) {
    const l = normalizeLanguage(c)
    if (l) return l
  }
  return 'es'
}

export function setLanguage(l: Language): void {
  if (l !== language()) void instance.changeLanguage(l)
}

/** Avisa cuando cambia el idioma, para que la interfaz se vuelva a pintar. Devuelve como desuscribirse. */
export function onLanguageChange(listener: (l: Language) => void): () => void {
  const handler = (l: string) => listener(l as Language)
  instance.on('languageChanged', handler)
  return () => instance.off('languageChanged', handler)
}

/**
 * Traductor fijo a un idioma, sin tocar el global. Para el motor, que atiende
 * mesas de idiomas distintos a la vez y no puede depender del idioma vigente.
 */
export function tFor(lng: Language): (key: MessageKey, vars?: Record<string, string | number>) => string {
  const fixed = instance.getFixedT(lng)
  return (key, vars) => fixed(key, vars ?? {}) as string
}
