import type { PackCharacter, PackNpc, TableMember } from '@rpg-ngn/api-client'
import { refId, refKind, type LoadedPack } from '@rpg-ngn/content'
import type { Speaker } from './blocks.js'
import { takenCharacters } from './table-setup.js'
import { packSpeakerResolver, type SpeakerResolver } from './turn.js'

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

/**
 * Resolver de hablantes que sirve para cualquier mesa: si el cliente lleva el
 * pack empaquetado, nombres y retratos salen de ahi; si no, de las listas que
 * da la API (`listPackCharacters`, `listPackNpcs`), y el retrato va como URL
 * en `portraitUri`, que cada cliente construye como le toque.
 *
 * Existe porque `packSpeakerResolver` solo conocia el pack empaquetado: en la
 * boticaria y en La Mascarada los NPC hablaban sin cara en los dos clientes,
 * aunque tuvieran retrato desde el dia uno. Se vio al darles cara a los NPC
 * del piloto y comprobar los otros dos packs (22-09).
 */
export function speakerResolverFor(input: {
  pack: LoadedPack | null
  characters: readonly PackCharacter[]
  npcs: readonly PackNpc[]
  /** Convierte la ruta del pack (`portraits/x.webp`) en la URL que el cliente puede pintar. */
  portraitUriOf: (path: string) => string | null
}): SpeakerResolver {
  if (input.pack) return packSpeakerResolver(input.pack)
  return (ref, name) => {
    const id = ref ? refId(ref) : null
    const kind = ref ? refKind(ref) : null
    const remoto: { name: string; portrait: string | null } | undefined =
      kind === 'character' ? input.characters.find((c) => c.id === id) : kind === 'npc' ? input.npcs.find((n) => n.id === id) : undefined
    const speaker: Speaker = {
      ref: ref ?? `unknown:${name ?? '?'}`,
      // Lo que escribio el engine manda sobre el nombre del pack: es lo que la
      // mesa ya leyo. El pack solo rellena si el engine no dijo nombre.
      name: name ?? remoto?.name ?? id ?? '?',
      portrait: null,
    }
    const uri = remoto?.portrait ? input.portraitUriOf(remoto.portrait) : null
    return uri ? { ...speaker, portraitUri: uri } : speaker
  }
}
