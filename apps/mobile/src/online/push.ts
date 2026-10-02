import { t } from '@rpg-ngn/i18n'
import type { ApiClient } from '@rpg-ngn/api-client'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { storage } from './storage'

/**
 * Avisos en el telefono (E12, "Avisos en la app"): el mismo canal `expo` de
 * atomo/push que ya usa la API. El token de Expo pide el `projectId` del
 * proyecto en expo.dev (`extra.eas.projectId` de app.json) y, en Android,
 * Firebase (`google-services.json`, fuera del repo publico). Sin cualquiera
 * de los dos la app dice que esta version no puede recibir avisos.
 */
export type PushState = 'loading' | 'on' | 'off' | 'blocked' | 'unavailable'

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  return extra?.eas?.projectId ?? null
}

// Con la app abierta tambien se muestra el aviso (por defecto Expo lo calla).
Notifications.setNotificationHandler({
  handleNotification: () => Promise.resolve({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
})

export async function pushState(): Promise<PushState> {
  if (Platform.OS === 'web' || !projectId()) return 'unavailable'
  // Android 13 reporta `denied` antes de la primera pregunta; solo esta
  // bloqueado si ya no se puede volver a preguntar (01-10).
  const { status, canAskAgain } = await Notifications.getPermissionsAsync()
  if (status === 'denied' && !canAskAgain) return 'blocked'
  return (await storage.pushToken()) ? 'on' : 'off'
}

async function expoToken(): Promise<string> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: t('mobile.push.channel'), importance: Notifications.AndroidImportance.DEFAULT })
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() ?? undefined })
  return data
}

/** Pide permiso, saca el token y lo registra en la cuenta. */
export async function enablePush(client: ApiClient): Promise<PushState> {
  if (!projectId()) return 'unavailable'
  const current = await Notifications.getPermissionsAsync()
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted
  if (!granted) return 'blocked'
  const token = await expoToken()
  await client.registerPush({ kind: 'expo', token, device: `${Platform.OS} ${String(Platform.Version)}` })
  await storage.setPushToken(token)
  return 'on'
}

export async function disablePush(client: ApiClient): Promise<PushState> {
  const token = await storage.pushToken()
  if (token) await client.unregisterPush(token)
  await storage.setPushToken(null)
  return 'off'
}

/**
 * Al abrir sesion, si este telefono tenia los avisos encendidos, vuelve a
 * registrar el token: Expo puede cambiarlo y la cuenta puede ser otra.
 * Silencioso: un fallo aqui no debe estorbar la entrada.
 */
export async function refreshPush(client: ApiClient): Promise<void> {
  try {
    if (!(await storage.pushToken()) || !projectId()) return
    if (!(await Notifications.getPermissionsAsync()).granted) return
    const token = await expoToken()
    await client.registerPush({ kind: 'expo', token, device: `${Platform.OS} ${String(Platform.Version)}` })
    await storage.setPushToken(token)
  } catch {
    // Se reintenta la proxima vez que se abra la app.
  }
}
