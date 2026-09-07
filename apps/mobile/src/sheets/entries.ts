import type { CharacterState } from '@rpg-ngn/core'
import type { Character, LoadedPack, Session } from '@rpg-ngn/content'
import { characterSlot, characterVisibility, everPlayed, VEILABLE_FIELDS, type CharacterSlot, type CharacterVisibility } from '@rpg-ngn/ui-logic'
import type { OfflineCampaign } from '../pack/offline'

/**
 * Lo que el modal de fichas necesita de cada personaje, ya decidido. Offline
 * lo decide la sesion del pack y el estado reducido; online lo deciden los
 * miembros de la mesa y las proyecciones de la API (la propia desde
 * `player:<id>`, las ajenas desde `world`). Misma regla de velado en ambos.
 * Sin React para poder probarlo con vitest.
 */
export interface SheetEntry {
  character: Character
  slot: CharacterSlot
  visibility: CharacterVisibility
  state: CharacterState | undefined
  /** Fuera de la mesa: retrato en gris. */
  muted: boolean
  /** Es el personaje de quien mira. */
  mine: boolean
}

const UNVEILED: CharacterVisibility = { veiled: false, fields: Object.fromEntries(VEILABLE_FIELDS.map((f) => [f, true])) as CharacterVisibility['fields'] }

function packCharacters(pack: LoadedPack): Character[] {
  return pack.manifest.characters.map((id) => pack.characters.get(id)).filter((c): c is Character => !!c)
}

export function offlineSheetEntries(campaign: OfflineCampaign, session: Session): SheetEntry[] {
  const played = everPlayed(campaign.pack.sessions.values())
  const choosing = session.status === 'planned' && (session.availableCharacters?.length ?? 0) > 0
  return packCharacters(campaign.pack).map((character) => {
    const slot = characterSlot(session, character.id)
    return {
      character,
      slot,
      visibility: characterVisibility(session, character, played),
      state: campaign.state.world.characters[character.id],
      muted: slot.kind === 'absent' && choosing,
      mine: false,
    }
  })
}

export interface OnlineSheetsInput {
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

export function onlineSheetEntries(input: OnlineSheetsInput): SheetEntry[] {
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
