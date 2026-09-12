import * as SecureStore from 'expo-secure-store'

/**
 * Lo que la app recuerda entre arranques: la URL del servidor y el token de
 * Sanctum, ambos en el almacen seguro del dispositivo (docs/11, D8: nunca en
 * AsyncStorage). Cada lectura y escritura va en try/catch porque en web y en
 * simuladores sin keychain el modulo puede no estar.
 */
export const DEFAULT_SERVER_URL = 'http://192.168.100.16:8010'

const KEYS = { serverUrl: 'rpg.server-url', token: 'rpg.token', user: 'rpg.user' } as const

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
    return (await read(KEYS.serverUrl)) ?? DEFAULT_SERVER_URL
  },
  setServerUrl: (url: string) => write(KEYS.serverUrl, url),

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
}
