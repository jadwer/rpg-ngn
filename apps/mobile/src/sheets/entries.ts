import type { CharacterState } from '@rpg-ngn/core'
import type { Character, Session } from '@rpg-ngn/content'
import { characterSlot, characterVisibility, everPlayed, onlineSheetEntries as onlineSheetEntriesShared, packCharacters, type CharacterSlot, type CharacterVisibility, type OnlineSheetsInput as OnlineSheetsInputShared } from '@rpg-ngn/ui-logic'
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

/** Online, la logica vive en ui-logic (`sheet-source.ts`): sirve igual para el pack empaquetado y para uno de la API. */
export type OnlineSheetsInput = OnlineSheetsInputShared

export function onlineSheetEntries(input: OnlineSheetsInput): SheetEntry[] {
  return onlineSheetEntriesShared(input)
}
