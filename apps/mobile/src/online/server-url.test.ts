import { describe, expect, it } from 'vitest'
import { isStaleLocalUrl, isUnusableServerUrl, isWebRootUrl, PUBLIC_SERVER_URL } from './server-url'

describe('server-url', () => {
  it('la app entra por /movil, no por la raiz de la web', () => {
    // Por la raiz contesta Next, cuyo proxy pide la cabecera de la web y
    // devuelve "Peticion rechazada: falta la cabecera de la web".
    expect(PUBLIC_SERVER_URL).toBe('https://rpg-worlds.gabinoramirez.com/movil')
    expect(PUBLIC_SERVER_URL.endsWith('/movil')).toBe(true)
  })

  it('descarta la raiz del servidor que guardo la version anterior', () => {
    expect(isWebRootUrl('https://rpg-worlds.gabinoramirez.com')).toBe(true)
    expect(isWebRootUrl('https://rpg-worlds.gabinoramirez.com/')).toBe(true)
    // La buena no se descarta, faltaria mas.
    expect(isWebRootUrl(PUBLIC_SERVER_URL)).toBe(false)
  })

  it('descarta las IP de la laptop que quedaron de antes', () => {
    expect(isStaleLocalUrl('http://192.168.100.16:8010')).toBe(true)
    expect(isStaleLocalUrl('http://127.0.0.1:8010')).toBe(true)
    expect(isStaleLocalUrl('http://10.0.0.5:8010')).toBe(true)
    expect(isStaleLocalUrl(PUBLIC_SERVER_URL)).toBe(false)
  })

  it('un servidor ajeno de verdad se respeta', () => {
    // Quien monte el suyo puede escribirlo en "Cambiar servidor".
    expect(isUnusableServerUrl('https://mesa.ejemplo.com/movil')).toBe(false)
    expect(isUnusableServerUrl('https://rpg-worlds.gabinoramirez.com')).toBe(true)
    expect(isUnusableServerUrl('http://192.168.1.4:8010')).toBe(true)
  })
})
