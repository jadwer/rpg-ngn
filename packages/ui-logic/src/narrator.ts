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
  const device = input.device ?? 'teléfono'
  const localSpeaking = state.status === 'speaking'
  const active = localSpeaking || state.status === 'paused'
  if (input.error) return { text: `Voz: ${input.error}`, warn: true }
  if (state.status === 'speaking') return { text: `Leyendo ${state.index + 1} de ${state.total}`, warn: false }
  if (state.status === 'paused') {
    return { text: input.nativePause ? `En pausa, ${state.index + 1} de ${state.total}` : `En pausa; Seguir salta al bloque ${Math.min(state.index + 2, state.total)}`, warn: false }
  }
  if (narrator.someoneNarrating) return { text: `Otro ${device} narra`, warn: false }
  if (nobodyNarrates(narrator, localSpeaking)) return { text: 'Nadie narra en voz alta', warn: !active }
  if (input.autoRead) return { text: 'Leerá lo nuevo', warn: false }
  if (state.status === 'done') return { text: 'Lectura terminada', warn: false }
  return { text: 'Voz lista', warn: false }
}
