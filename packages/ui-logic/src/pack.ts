import type { Character, LoadedPack, Session } from '@rpg-ngn/content'

/**
 * Lecturas triviales del pack que las dos apps repetian: personajes y
 * sesiones en el orden del manifiesto y el nombre de un personaje por id.
 */

/** Personajes del pack en el orden del manifiesto. */
export function packCharacters(pack: LoadedPack): Character[] {
  return pack.manifest.characters.map((id) => pack.characters.get(id)).filter((c): c is Character => !!c)
}

/** Sesiones del pack en el orden del manifiesto. */
export function sessionList(pack: LoadedPack): Session[] {
  return pack.manifest.sessions.map((id) => pack.sessions.get(id)).filter((s): s is Session => !!s)
}

/** Nombre del personaje, o el id tal cual si el pack no lo tiene; null sin id. */
export function characterName(pack: LoadedPack | null, id: string | null | undefined): string | null {
  if (!id) return null
  return pack?.characters.get(id)?.name ?? id
}
