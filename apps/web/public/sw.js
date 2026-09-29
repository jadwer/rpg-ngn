/* global self, URL */
/*
 * Service worker de avisos (Web Push). Solo recibe y muestra: no cachea nada,
 * asi que no cambia como carga la web. El servidor manda { title, body, url, tag };
 * tocar el aviso abre (o enfoca) esa pagina.
 */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Ad Astra Mentis', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Ad Astra Mentis'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      icon: '/pwa/icon-192.png',
      badge: '/pwa/icon-192.png',
      data: { url: data.url || '/mesas' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/mesas', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (w.url === url && 'focus' in w) return w.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
