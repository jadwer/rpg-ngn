import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { parseVoiceSettings, type VoiceSettings } from '../speech/voices'

/**
 * Lo que la app recuerda entre arranques: la URL del servidor, el token de
 * Sanctum y las preferencias de voz, todo en el almacen seguro del
 * dispositivo (docs/11, D8: el token nunca en AsyncStorage; las preferencias
 * van al mismo sitio para no sumar otra dependencia nativa). Cada lectura y
 * escritura va en try/catch porque en web y en simuladores sin keychain el
 * modulo puede no estar.
 */
const API_PORT = 8010

/**
 * URL por defecto de la API. En desarrollo la laptop que sirve Metro es la
 * misma que corre la API, asi que se toma la IP con la que el telefono llego
 * al bundle (`hostUri`, por ejemplo `192.168.100.11:8081`) y se cambia el
 * puerto; un cambio de DHCP ya no deja la app apuntando a una IP vieja. Sin
 * Metro (build de tienda) queda el servidor publico, que hoy no existe.
 */
export function defaultServerUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  return host ? `http://${host}:${API_PORT}` : 'http://127.0.0.1:8010'
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

export const storage = {
  async serverUrl(): Promise<string> {
    return (await read(KEYS.serverUrl)) ?? defaultServerUrl()
  },
  /** Solo persiste una URL escrita a mano; la derivada de Metro se recalcula en cada arranque. */
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

  /** Voz, velocidad y tono del narrador; por telefono, no por cuenta. */
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
