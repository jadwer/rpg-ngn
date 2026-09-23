/**
 * Saca el token de un enlace de invitacion, venga como venga.
 *
 * En el telefono la gente no abre el enlace en la app: lo recibe por
 * WhatsApp y lo pega. Y pega lo que sea: la URL entera, la URL con espacios
 * alrededor, o solo el token si alguien se lo dicto. Todo eso tiene que
 * valer. Devuelve null si ahi no hay ningun token reconocible.
 */
export function inviteTokenFrom(text: string): string | null {
  const limpio = text.trim()
  if (!limpio) return null
  const enUrl = /\/unirse\/([A-Za-z0-9]{16,64})/.exec(limpio)
  if (enUrl?.[1]) return enUrl[1]
  return /^[A-Za-z0-9]{16,64}$/.test(limpio) ? limpio : null
}
