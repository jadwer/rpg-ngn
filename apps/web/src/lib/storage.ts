import { clampPitch, clampRate, DEFAULT_NARRATOR_PITCH, DEFAULT_READING_LANGUAGE, isReadingLanguage, type ReadingLanguage } from '@rpg-ngn/ui-logic'

/**
 * Lo que la web recuerda entre recargas, en `localStorage`. El token de
 * Sanctum solo se guarda aqui en modo API directa (otra URL escrita a mano);
 * por defecto viaja en una cookie httpOnly que el navegador no puede leer
 * (ver server/apiProxy.ts). Cada lectura y escritura va en try/catch porque
 * Safari en privado y algunas politicas lanzan al tocar el almacen; sin el,
 * la sesion dura lo que dure la pestaña.
 */

const KEYS = {
  server: 'rpg.web.server',
  token: 'rpg.web.token',
  user: 'rpg.web.user',
  voice: 'rpg.web.voice',
  rate: 'rpg.web.rate',
  pitch: 'rpg.web.pitch',
  autoRead: 'rpg.web.autoread',
  voiceNotice: 'rpg.web.voice-notice',
  lang: 'rpg.web.lang',
} as const

export interface StoredUser {
  id: string
  name: string
  email: string
}

function read(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // sin almacen: la sesion dura lo que dure la pestaña
  }
}

/**
 * URL de la API por defecto. Vacia significa "el propio origen de la web",
 * que Next reenvia a la API con el token de la cookie; asi no hay CORS en la
 * LAN. `NEXT_PUBLIC_API_URL` la sustituye cuando la API vive en otro host.
 */
export function defaultServerUrl(): string {
  return (process.env['NEXT_PUBLIC_API_URL'] ?? '').trim().replace(/\/+$/, '')
}

/** Lo que se muestra en el campo de servidor cuando la URL es el propio origen. */
export function displayServerUrl(url: string): string {
  if (url) return url
  return typeof window === 'undefined' ? '' : window.location.origin
}

export const storage = {
  serverUrl: (): string => read(KEYS.server) ?? defaultServerUrl(),
  /** Solo persiste una URL escrita a mano; la de por defecto se recalcula en cada arranque. */
  setServerUrl: (url: string) => write(KEYS.server, url === defaultServerUrl() ? null : url),

  token: () => read(KEYS.token),
  setToken: (token: string | null) => write(KEYS.token, token),

  user(): StoredUser | null {
    const raw = read(KEYS.user)
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredUser
    } catch {
      return null
    }
  },
  setUser: (user: StoredUser | null) => write(KEYS.user, user ? JSON.stringify(user) : null),

  clearSession(): void {
    write(KEYS.token, null)
    write(KEYS.user, null)
  },

  voice: () => read(KEYS.voice),
  setVoice: (uri: string | null) => write(KEYS.voice, uri),

  rate: (): number => clampRate(Number(read(KEYS.rate) ?? '1')),
  setRate: (rate: number) => write(KEYS.rate, String(clampRate(rate))),

  /** Tono del narrador (la party va al natural y cada NPC con el suyo). */
  narratorPitch: (): number => clampPitch(Number(read(KEYS.pitch) ?? String(DEFAULT_NARRATOR_PITCH))),
  setNarratorPitch: (pitch: number) => write(KEYS.pitch, String(clampPitch(pitch))),

  autoRead: () => read(KEYS.autoRead) === '1',
  setAutoRead: (value: boolean) => write(KEYS.autoRead, value ? '1' : null),

  voiceNoticeSeen: () => read(KEYS.voiceNotice) === '1',
  setVoiceNoticeSeen: () => write(KEYS.voiceNotice, '1'),

  lang(): ReadingLanguage {
    const value = read(KEYS.lang)
    return isReadingLanguage(value) ? value : DEFAULT_READING_LANGUAGE
  },
  setLang: (lang: ReadingLanguage) => write(KEYS.lang, lang === DEFAULT_READING_LANGUAGE ? null : lang),
}
