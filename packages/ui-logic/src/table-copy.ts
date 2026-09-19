import type { PackOption } from '@rpg-ngn/api-client'

/**
 * Los textos de ayuda de "mesa nueva", que dependen del pack elegido.
 *
 * Estaban escritos para el piloto: quien elegia otro pack leia un ejemplo de
 * premisa sobre Valdoria y la mina, que no tiene nada que ver con lo que va
 * a jugar. Un ejemplo que habla de otro mundo confunde mas que ayudar.
 */

/**
 * Nombre de un personaje cuando la mesa puede jugar un pack que el cliente no
 * lleva empaquetado.
 *
 * `characterName` cae en el id cuando el pack no lo conoce, asi que encadenarle
 * un `?? remoto[id]` no sirve de nada: nunca devuelve null y el nombre remoto
 * jamas gana. Aqui el orden esta explicito, que es lo que hacia falta para que
 * la mesa no diga "juegas a shiho".
 */
export function characterNameFrom(
  local: { characters: { get(id: string): { name: string } | undefined } } | null,
  remote: Readonly<Record<string, string>>,
  id: string,
): string {
  return local?.characters.get(id)?.name ?? remote[id] ?? id
}

/** Nombre sugerido para la mesa, a partir del pack. */
export function tableNamePlaceholder(pack: Pick<PackOption, 'name'> | null): string {
  return pack ? `${pack.name}, sábado` : 'La mesa del sábado'
}

/**
 * Ejemplo de premisa. Sin pack, uno neutro; con pack, se apoya en su nombre
 * y su lema, que es lo unico suyo que conocemos sin cargar el contenido.
 */
export function premisePlaceholder(pack: Pick<PackOption, 'name' | 'tagline'> | null): string {
  const base = 'Campaña, escena o tono; el director de juego la usa como punto de partida.'
  if (!pack) return `${base} Por ejemplo: "Primera noche, todos se conocen por primera vez y algo va mal desde el principio."`
  const gancho = pack.tagline ? ` ${pack.tagline}` : ''
  return `${base} Por ejemplo: "Empezamos en ${pack.name}.${gancho} Tono de misterio, ritmo ágil, español de México."`
}

/** Lo que se lee bajo el selector de pack: de que va y cuanto trae. */
export function packSummaryText(pack: PackOption | null): string | null {
  if (!pack) return null
  const piezas: string[] = []
  if (pack.characters > 0) piezas.push(`${pack.characters} ${pack.characters === 1 ? 'personaje' : 'personajes'}`)
  if (pack.sessions > 0) piezas.push(`${pack.sessions} ${pack.sessions === 1 ? 'sesión escrita' : 'sesiones escritas'}`)
  const detalle = piezas.length > 0 ? ` (${piezas.join(', ')})` : ''
  return pack.tagline ? `${pack.tagline}${detalle}` : `Sistema ${pack.system}${detalle}`
}

/**
 * La linea bajo el nombre de la mesa en la lista.
 *
 * Antes decia `private-botica@0.1.0 · court-intrigue@1.0.0`, que es lo que
 * el motor necesita saber y a quien juega no le dice nada. Con el catalogo
 * cargado se pone el nombre del pack; sin el, el id, que al menos es corto.
 */
export function tableCardMeta(
  table: { packId: string; packVersion: string; premise?: string | null },
  packs: readonly PackOption[] = [],
): string {
  const pack = packs.find((p) => p.id === table.packId)
  const partes = [pack?.name ?? table.packId]
  if (table.premise) partes.push('con premisa')
  return partes.join(' · ')
}
