import { describe, expect, it } from 'vitest'
import { isLegacyPublicUrl, isStaleLocalUrl, isUnusableServerUrl, isWebRootUrl, PUBLIC_SERVER_URL, webOriginOf } from './server-url'

describe('server-url', () => {
  it('la app entra por /movil, no por la raiz de la web', () => {
    // Por la raiz contesta Next, cuyo proxy pide la cabecera de la web y
    // devuelve "Peticion rechazada: falta la cabecera de la web".
    expect(PUBLIC_SERVER_URL).toBe('https://adastramentis.com/movil')
    expect(PUBLIC_SERVER_URL.endsWith('/movil')).toBe(true)
  })

  it('descarta la raiz del servidor que guardo la version anterior', () => {
    expect(isWebRootUrl('https://adastramentis.com')).toBe(true)
    expect(isWebRootUrl('https://adastramentis.com/')).toBe(true)
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
    expect(isUnusableServerUrl('https://adastramentis.com')).toBe(true)
    expect(isUnusableServerUrl('http://192.168.1.4:8010')).toBe(true)
  })
})

describe('origen de la web para los enlaces que se comparten', () => {
  it('quita /movil: la web contesta en la raiz', () => {
    expect(webOriginOf('https://adastramentis.com/movil')).toBe('https://adastramentis.com')
    expect(webOriginOf('https://adastramentis.com/movil/')).toBe('https://adastramentis.com')
  })

  it('deja igual un servidor local y usa el publico si no hay', () => {
    expect(webOriginOf('http://192.168.1.5:3010')).toBe('http://192.168.1.5:3010')
    expect(webOriginOf('')).toBe('https://adastramentis.com')
  })
})

describe('servidor de antes del dominio propio', () => {
  it('una direccion guardada con rpg-worlds se cambia a la nueva', () => {
    expect(isLegacyPublicUrl('https://rpg-worlds.gabinoramirez.com/movil')).toBe(true)
    expect(isLegacyPublicUrl('https://rpg-worlds.gabinoramirez.com/movil/')).toBe(true)
    expect(isUnusableServerUrl('https://rpg-worlds.gabinoramirez.com/movil')).toBe(true)
    expect(isUnusableServerUrl(PUBLIC_SERVER_URL)).toBe(false)
  })
})
