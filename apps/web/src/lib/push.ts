import { t } from '@rpg-ngn/i18n'
import type { ApiClient } from '@rpg-ngn/api-client'

/**
 * Avisos en este navegador (Web Push). El permiso lo da la persona; la
 * suscripcion se guarda en la API para que el servidor sepa a donde mandar.
 */
export type PushState = 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on'

function isIos(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)
}

export async function pushState(): Promise<PushState> {
  if (typeof window === 'undefined') return 'unsupported'
  // En iPhone solo hay push con la web agregada a la pantalla de inicio.
  if (isIos() && !isStandalone()) return 'needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  return subscription ? 'on' : 'off'
}

function keyBytes(base64url: string): ArrayBuffer {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

function deviceLabel(): string {
  const ua = navigator.userAgent
  const browser = /edg/i.test(ua) ? 'Edge' : /firefox/i.test(ua) ? 'Firefox' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : t('common.browser')
  const os = /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iPhone' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : ''
  return os ? `${browser} en ${os}` : browser
}

/** Pide permiso, suscribe este navegador y lo registra en la API. */
export async function enablePush(client: ApiClient): Promise<PushState> {
  const { vapidPublicKey } = await client.pushConfig()
  if (!vapidPublicKey) throw new Error(t('common.pushNotEnabled'))
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }))
  const json = subscription.toJSON()
  await client.registerPush({ kind: 'webpush', token: subscription.endpoint, p256dh: json.keys?.['p256dh'] ?? '', auth: json.keys?.['auth'] ?? '', device: deviceLabel() })
  return 'on'
}

/** Deja de avisar a este navegador. */
export async function disablePush(client: ApiClient): Promise<PushState> {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    await client.unregisterPush(subscription.endpoint).catch(() => undefined)
    await subscription.unsubscribe()
  }
  return 'off'
}
