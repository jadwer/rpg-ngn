/**
 * A donde ir despues de entrar o crear cuenta.
 *
 * Existe por el enlace de invitacion (docs/18, D-UX-1): quien abre un enlace
 * sin tener cuenta pasa por el registro, y si al volver acaba en la lista de
 * mesas vacia, **se pierde justo a la persona que veniamos a ganar**.
 *
 * Solo se aceptan rutas internas (`/algo`). Una URL absoluta o `//otro.sitio`
 * convertiria esta pantalla en un salto a cualquier parte, que es una forma
 * conocida de hacer pasar un enlace ajeno por propio.
 */
export const DESTINO_POR_OMISION = '/mesas'

export function destinoSeguro(raw: string | null | undefined): string {
  if (!raw) return DESTINO_POR_OMISION
  if (!raw.startsWith('/') || raw.startsWith('//')) return DESTINO_POR_OMISION
  return raw
}
