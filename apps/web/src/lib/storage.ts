/**
 * Lo que la web recuerda entre recargas. Todo en `localStorage`, que es
 * provisional: el token de Sanctum deberia viajar en una cookie httpOnly
 * cuando la plataforma la exponga (docs/11, D8). Mientras, cada lectura y
 * escritura va en try/catch porque Safari en privado y algunas politicas
 * lanzan al tocar el almacen; sin el, la sesion dura lo que dure la pestaña.
 */

const KEYS = {
  server: 'rpg.web.server',
  token: 'rpg.web.token',
  user: 'rpg.web.user',
  voice: 'rpg.web.voice',
  rate: 'rpg.web.rate',
  autoRead: 'rpg.web.autoread',
  voiceNotice: 'rpg.web.voice-notice',
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
 * que Next reenvia a la API (next.config.ts); asi no hay CORS en la LAN.
 * `NEXT_PUBLIC_API_URL` la sustituye cuando la API vive en otro host.
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

  rate(): number {
    const value = Number(read(KEYS.rate))
    return Number.isFinite(value) && value >= 0.5 && value <= 2 ? value : 1
  },
  setRate: (rate: number) => write(KEYS.rate, String(rate)),

  autoRead: () => read(KEYS.autoRead) === '1',
  setAutoRead: (value: boolean) => write(KEYS.autoRead, value ? '1' : null),

  voiceNoticeSeen: () => read(KEYS.voiceNotice) === '1',
  setVoiceNoticeSeen: () => write(KEYS.voiceNotice, '1'),
}
