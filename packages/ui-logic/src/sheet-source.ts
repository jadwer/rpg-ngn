import type { CharacterState } from '@rpg-ngn/core'
import type { Character, LoadedPack, Session } from '@rpg-ngn/content'
import type { PackSheets } from '@rpg-ngn/engine-contract'
import { packCharacters } from './pack.js'
import { characterVisibility, everPlayed, VEILABLE_FIELDS, type CharacterSlot, type CharacterVisibility } from './veil.js'

/**
 * De donde salen las fichas de una mesa (E3 del VAM del 19-09): del pack
 * empaquetado en el cliente o de lo que la API da de un pack que el cliente
 * no lleva (los subidos por la gente, los privados del servidor). Con esto
 * el panel de fichas es el mismo en los dos casos, y el velo se aplica aqui,
 * en el cliente, porque es presentacion y no frontera de seguridad.
 */
export interface SheetSource {
  characters: Character[]
  sessions: ReadonlyMap<string, Session>
}

export function sheetSourceOf(pack: LoadedPack): SheetSource {
  return { characters: packCharacters(pack), sessions: pack.sessions }
}

export function sheetSourceFrom(sheets: PackSheets): SheetSource {
  return { characters: sheets.characters, sessions: new Map(sheets.sessions.map((s) => [s.id, s])) }
}

/** Lo que el panel de fichas necesita de cada personaje, ya decidido. */
export interface OnlineSheetEntry {
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

export interface OnlineSheetsInput {
  source: SheetSource
  /** Codigo de la sesion abierta en la mesa, o null si no hay ninguna. */
  sessionCode: string | null
  members: ReadonlyArray<{ characterId: string | null; userName: string | null }>
  viewerCharacterId: string | null
  /** `projection.character` de `player:<viewer>`. */
  own: CharacterState | undefined
  /** `projection.characters` de `world`. */
  world: Record<string, CharacterState> | undefined
}

/**
 * Quien juega cada personaje en la mesa, que se ve de el (misma regla de
 * velado que apps/sheets) y su estado vivo: la propia ficha desde
 * `player:<id>`, las ajenas desde `world`.
 */
export function onlineSheetEntries(input: OnlineSheetsInput): OnlineSheetEntry[] {
  const { source, members } = input
  const session = input.sessionCode ? (source.sessions.get(input.sessionCode) ?? null) : null
  const played = everPlayed(source.sessions.values())
  for (const member of members) if (member.characterId) played.add(member.characterId)

  return source.characters.map((character) => {
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
