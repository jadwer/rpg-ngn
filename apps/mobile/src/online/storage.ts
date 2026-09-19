import { parseVoiceSettings, type VoiceSettings } from '@rpg-ngn/ui-logic'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

/**
 * Lo que la app recuerda entre arranques: la URL del servidor, el token de
 * Sanctum y las preferencias de voz, todo en el almacen seguro del
 * dispositivo (docs/11, D8: el token nunca en AsyncStorage; las preferencias
 * van al mismo sitio para no sumar otra dependencia nativa). Cada lectura y
 * escritura va en try/catch porque en web y en simuladores sin keychain el
 * modulo puede no estar.
 */
const API_PORT = 8010

/** El servidor de verdad. Es a donde va la app salvo que se le diga otra cosa. */
export const PUBLIC_SERVER_URL = 'https://rpg-worlds.gabinoramirez.com'

/**
 * URL por defecto de la API: **el servidor publico**.
 *
 * Antes se derivaba de `hostUri` de Metro para apuntar a la laptop que
 * servia el bundle, porque no habia otro sitio al que ir. Desde que existe
 * rpg-worlds, eso solo confundia: quien abre la app espera entrar a su mesa,
 * no montar un servidor.
 *
 * Para desarrollar contra la laptop se pone `EXPO_PUBLIC_API_URL` en el
 * `.env` de la app, o se escribe la direccion en "Cambiar servidor". Lo que
 * se escriba a mano manda sobre esto (lo guarda `setServerUrl`).
 */
export function defaultServerUrl(): string {
  const configured = process.env['EXPO_PUBLIC_API_URL']
  if (typeof configured === 'string' && configured.trim() !== '') return configured.trim()
  return PUBLIC_SERVER_URL
}

/** La API en la maquina que sirve el bundle, para desarrollar en LAN. */
export function metroServerUrl(): string | null {
  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  return host ? `http://${host}:${API_PORT}` : null
}

export const DEFAULT_SERVER_URL = defaultServerUrl()

const KEYS = { serverUrl: 'rpg.server-url', token: 'rpg.token', user: 'rpg.user', voice: 'rpg.voice', autoRead: 'rpg.autoread', voiceNotice: 'rpg.voice-notice' } as const

export interface StoredUser {
  id: string
  name: string
  email: string
}

async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

async function write(key: string, value: string | null): Promise<void> {
  try {
    if (value === null) await SecureStore.deleteItemAsync(key)
    else await SecureStore.setItemAsync(key, value)
  } catch {
    // sin almacen seguro (web, simulador sin keychain): la sesion dura lo que dure la app
  }
}

/**
 * Una direccion de red local (la laptop de alguien) que quedo guardada de
 * cuando no habia servidor publico. Esas IP las reparte el router y cambian,
 * asi que apuntan a un sitio que ya no responde: mejor volver al servidor.
 */
function isStaleLocalUrl(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url)
}

export const storage = {
  async serverUrl(): Promise<string> {
    const saved = await read(KEYS.serverUrl)
    if (saved && !isStaleLocalUrl(saved)) return saved
    // Se descarta en silencio: quien de verdad juegue en LAN puede volver a
    // escribirla en "Cambiar servidor".
    if (saved) await write(KEYS.serverUrl, null)
    return defaultServerUrl()
  },
  /** Solo persiste una URL escrita a mano; la de por defecto no se guarda. */
  setServerUrl: (url: string) => write(KEYS.serverUrl, url === defaultServerUrl() ? null : url),

  token: () => read(KEYS.token),
  setToken: (token: string | null) => write(KEYS.token, token),

  async user(): Promise<StoredUser | null> {
    const raw = await read(KEYS.user)
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredUser
    } catch {
      return null
    }
  },
  setUser: (user: StoredUser | null) => write(KEYS.user, user ? JSON.stringify(user) : null),

  async clearSession(): Promise<void> {
    await write(KEYS.token, null)
    await write(KEYS.user, null)
  },

  /** Voz, velocidad, tono del narrador e idioma de lectura; por telefono, no por cuenta. */
  async voiceSettings(): Promise<VoiceSettings> {
    const raw = await read(KEYS.voice)
    if (!raw) return parseVoiceSettings(null)
    try {
      return parseVoiceSettings(JSON.parse(raw) as Record<string, unknown>)
    } catch {
      return parseVoiceSettings(null)
    }
  },
  setVoiceSettings: (settings: VoiceSettings) => write(KEYS.voice, JSON.stringify(settings)),

  autoRead: async () => (await read(KEYS.autoRead)) === '1',
  setAutoRead: (value: boolean) => write(KEYS.autoRead, value ? '1' : null),

  /** El aviso de "sin voz en español" se muestra una vez por telefono. */
  voiceNoticeSeen: async () => (await read(KEYS.voiceNotice)) === '1',
  setVoiceNoticeSeen: () => write(KEYS.voiceNotice, '1'),
}
