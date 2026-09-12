import type { CharacterState } from '@rpg-ngn/core'
import type { Character, LoadedPack } from '@rpg-ngn/content'
import { characterVisibility, everPlayed, VEILABLE_FIELDS, type CharacterSlot, type CharacterVisibility } from '@rpg-ngn/ui-logic'

/**
 * Lo que el panel de fichas necesita de cada personaje, ya decidido: quien
 * lo juega en la mesa, que se ve (misma regla de velado que apps/sheets y
 * la app movil) y su estado vivo, la propia desde `player:<id>` y las ajenas
 * desde `world`. Sin React para poder probarlo con vitest.
 */
export interface SheetEntry {
  character: Character
  slot: CharacterSlot
  visibility: CharacterVisibility
  state: CharacterState | undefined
  /** Fuera de la mesa: retrato apagado. */
  muted: boolean
  /** Es el personaje de quien mira. */
  mine: boolean
}

const UNVEILED: CharacterVisibility = { veiled: false, fields: Object.fromEntries(VEILABLE_FIELDS.map((f) => [f, true])) as CharacterVisibility['fields'] }

export function packCharacters(pack: LoadedPack): Character[] {
  return pack.manifest.characters.map((id) => pack.characters.get(id)).filter((c): c is Character => !!c)
}

export interface SheetsInput {
  pack: LoadedPack
  /** Codigo de la sesion abierta en la mesa, o null si no hay ninguna. */
  sessionCode: string | null
  members: ReadonlyArray<{ characterId: string | null; userName: string | null }>
  viewerCharacterId: string | null
  /** `projection.character` de `player:<viewer>`. */
  own: CharacterState | undefined
  /** `projection.characters` de `world`. */
  world: Record<string, CharacterState> | undefined
}

export function sheetEntries(input: SheetsInput): SheetEntry[] {
  const { pack, members } = input
  const session = input.sessionCode ? (pack.sessions.get(input.sessionCode) ?? null) : null
  const played = everPlayed(pack.sessions.values())
  for (const member of members) if (member.characterId) played.add(member.characterId)

  return packCharacters(pack).map((character) => {
    const member = members.find((m) => m.characterId === character.id)
    const slot: CharacterSlot = member
      ? { kind: 'taken', player: member.userName ?? 'jugador' }
      : session?.availableCharacters?.includes(character.id)
        ? { kind: 'free' }
        : { kind: 'absent' }
    const mine = input.viewerCharacterId === character.id
    return {
      character,
      slot,
      visibility: session ? characterVisibility(session, character, played) : UNVEILED,
      state: (mine ? input.own : undefined) ?? input.world?.[character.id],
      muted: slot.kind === 'absent',
      mine,
    }
  })
}

/** Aviso que sustituye a la cita cuando la ficha esta velada (misma frase que apps/sheets). */
export const VEIL_NOTE = 'Tu personaje no recuerda quién es. Elige por lo que ves: raza, clase y de qué es capaz. Lo demás lo descubres jugando.'
