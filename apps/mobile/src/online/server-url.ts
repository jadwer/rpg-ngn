/**
 * A que direccion habla la app, sin tocar el almacen seguro.
 *
 * Vive aparte de `storage.ts` para poder probarlo: ese modulo importa
 * `expo-secure-store` y arrastra medio Expo a los tests. Esta decision ya
 * se equivoco una vez en produccion (ver `PUBLIC_SERVER_URL`), asi que
 * conviene que tenga red.
 */

/**
 * El servidor de verdad. **Lleva `/movil` a proposito.**
 *
 * En ese dominio la raiz la sirve la web de Next, y su proxy de `/api/*`
 * exige una cabecera propia (`X-Requested-With: rpg-ngn-web`) para frenar
 * CSRF, porque alli la sesion va en cookie httpOnly. La app no usa cookies
 * sino token Bearer, asi que por la raiz se llevaba un 403: "Peticion
 * rechazada: falta la cabecera de la web". `/movil` entra directo a Laravel.
 */
export const PUBLIC_SERVER_URL = 'https://rpg-worlds.gabinoramirez.com/movil'

/** La raiz del mismo dominio, donde contesta la web y no la API. */
const WEB_ROOT = PUBLIC_SERVER_URL.replace(/\/movil$/, '')

/**
 * Una direccion de red local (la laptop de alguien) que quedo guardada de
 * cuando no habia servidor publico. Esas IP las reparte el router y cambian,
 * asi que apuntan a un sitio que ya no responde.
 */
export function isStaleLocalUrl(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url)
}

/**
 * La raiz del servidor publico, que una version anterior de la app guardo.
 * Ahi contesta la web y todo da 403.
 */
export function isWebRootUrl(url: string): boolean {
  return url.trim().replace(/\/+$/, '') === WEB_ROOT
}

/** Si una direccion guardada ya no sirve y hay que volver a la de por defecto. */
export function isUnusableServerUrl(url: string): boolean {
  return isStaleLocalUrl(url) || isWebRootUrl(url)
}
