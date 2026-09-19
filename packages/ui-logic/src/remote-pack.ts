import type { PackCharacter, TableMember } from '@rpg-ngn/api-client'
import { takenCharacters } from './table-setup.js'

/**
 * Lo que un cliente necesita de un pack que NO lleva empaquetado: los
 * personajes vienen del servidor como `PackCharacter` (resumen con retrato),
 * y aqui se decide cuales quedan libres para invitar y como se llaman.
 *
 * Es el espejo de `freeCharacters` y `characterName`, que trabajan sobre el
 * `LoadedPack` empaquetado. Existe porque invitar a la boticaria desde
 * cualquier cliente ofrecia cero personajes (VAM del 19-09, web A7 y
 * movil A8): los dos paneles solo miraban el pack empaquetado.
 */

/** Personajes del pack remoto que nadie juega todavia en la mesa. */
export function freeRemoteCharacters(characters: readonly PackCharacter[], members: readonly TableMember[]): PackCharacter[] {
  const taken = takenCharacters(members)
  return characters.filter((c) => !taken.has(c.id))
}

/** `id -> nombre`, para `characterNameFrom` y para las etiquetas de la mesa. */
export function remoteCharacterNames(characters: readonly PackCharacter[]): Record<string, string> {
  return Object.fromEntries(characters.map((c) => [c.id, c.name]))
}

/** El retrato de un personaje remoto por id, o null si no lo hay. */
export function remotePortraitOf(characters: readonly PackCharacter[], id: string | null | undefined): string | null {
  if (!id) return null
  return characters.find((c) => c.id === id)?.portrait ?? null
}
