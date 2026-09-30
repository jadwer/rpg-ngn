import { t } from '@rpg-ngn/i18n'
import type { TtsState } from './tts.js'

/**
 * Bandera de narrador (docs/09, "Voz"). Local en V1: la mesa esta en el
 * mismo cuarto y se avisa de viva voz; compartirla entre dispositivos
 * necesita un endpoint. Nadie narrando: aviso visible. Alguien marca que
 * otro dispositivo narra: el aviso desaparece. Cualquiera puede descartarlo
 * y no vuelve hasta que se restaure. Aqui vive la maquina de estado y el
 * resumen de la linea de voz; cada app la conecta a su contexto.
 */

export interface NarratorFlag {
  /** Otro dispositivo de la mesa esta leyendo en voz alta. */
  someoneNarrating: boolean
  /** La mesa juega leyendo: no avisar de que nadie narra. */
  dismissed: boolean
}

export const NARRATOR_IDLE: NarratorFlag = { someoneNarrating: false, dismissed: false }

export type NarratorAction = { type: 'set'; value: boolean } | { type: 'dismiss' } | { type: 'restore' }

export function narratorReducer(state: NarratorFlag, action: NarratorAction): NarratorFlag {
  switch (action.type) {
    case 'set':
      return state.someoneNarrating === action.value ? state : { ...state, someoneNarrating: action.value }
    case 'dismiss':
      return state.dismissed ? state : { ...state, dismissed: true }
    case 'restore':
      return state.dismissed ? { ...state, dismissed: false } : state
  }
}

/** true cuando hay que avisar: nadie lee en voz alta (ni aqui ni en otro dispositivo) y la mesa no lo descarto. */
export function nobodyNarrates(flag: NarratorFlag, localSpeaking: boolean): boolean {
  return !flag.someoneNarrating && !localSpeaking && !flag.dismissed
}

/** Un miembro que anuncio que lee en voz alta (`narrators` del estado de la mesa). */
export interface NarratorPresence {
  memberId: number
  name: string | null
  characterId: string | null
}

/**
 * Traduce los narradores que devuelve la API a la bandera local. Al propio
 * dispositivo no se le cuenta: ya sabe si esta leyendo. Asi el aviso "nadie
 * narra" desaparece solo cuando otro pulsa Leer, sin que nadie marque nada.
 */
export function narratorsToFlag(narrators: readonly NarratorPresence[], ownMemberId: number, previous: NarratorFlag): NarratorFlag {
  const others = narrators.filter((n) => n.memberId !== ownMemberId)
  const someoneNarrating = others.length > 0
  return someoneNarrating === previous.someoneNarrating ? previous : { ...previous, someoneNarrating }
}

/** Como se llama a quien narra, para el aviso: su personaje, su nombre, o algo generico. */
export function narratorLabel(narrators: readonly NarratorPresence[], ownMemberId: number, nameOf: (characterId: string) => string, device: string = t('table.voice.device')): string | null {
  const other = narrators.find((n) => n.memberId !== ownMemberId)
  if (!other) return null
  if (other.characterId) return t('table.voice.narrates', { name: nameOf(other.characterId) })
  if (other.name) return t('table.voice.narrates', { name: other.name })
  return t('table.voice.otherDevice', { device })
}

export interface VoiceLineInput {
  state: TtsState
  nativePause: boolean
  error: string | null
  narrator: NarratorFlag
  /** null si la pantalla no ofrece "leer lo nuevo" (offline). */
  autoRead: boolean | null
  /** Como se llama al otro aparato: `teléfono` en la app, `dispositivo` en la web. */
  device?: string
}

/** Resumen de la linea de voz plegada; `warn` pide color de aviso. */
export function voiceLineSummary(input: VoiceLineInput): { text: string; warn: boolean } {
  const { state, narrator } = input
  const device = input.device ?? t('table.voice.phone')
  const localSpeaking = state.status === 'speaking'
  const active = localSpeaking || state.status === 'paused'
  if (input.error) return { text: t('table.voice.error', { error: input.error }), warn: true }
  if (state.status === 'speaking') return { text: t('table.voice.reading', { index: state.index + 1, total: state.total }), warn: false }
  if (state.status === 'paused') {
    return { text: input.nativePause ? t('table.voice.paused', { index: state.index + 1, total: state.total }) : t('table.voice.pausedSkip', { index: Math.min(state.index + 2, state.total) }), warn: false }
  }
  if (narrator.someoneNarrating) return { text: t('table.voice.otherDevice', { device }), warn: false }
  if (nobodyNarrates(narrator, localSpeaking)) return { text: t('table.voice.nobody'), warn: !active }
  if (input.autoRead) return { text: t('table.voice.autoRead'), warn: false }
  if (state.status === 'done') return { text: t('table.voice.done'), warn: false }
  return { text: t('table.voice.ready'), warn: false }
}
