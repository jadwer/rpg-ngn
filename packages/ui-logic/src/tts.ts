import { speechTextOf, type BlockKind, type TurnBlock } from './blocks.js'

/**
 * Cola de TTS por bloques (docs/09, "Narracion por voz"). La maquina de
 * estado es pura (`ttsReducer`) y el controlador la conecta con un
 * `SpeechEngine` inyectado: expo-speech en la app, Web Speech en web, un
 * doble en los tests. Pausa y reanudacion nativas son opcionales porque
 * Android no las tiene; sin ellas, pausar detiene la voz y reanudar salta al
 * bloque siguiente, que con narracion por bloques es lo que la mesa espera.
 */

export interface SpeechEngine {
  /** `item` trae el tipo de bloque y quien habla, por si el motor cambia la voz o el tono por hablante. */
  speak(text: string, onDone: () => void, item?: TtsItem): void
  stop(): void
  pause?(): void
  resume?(): void
}

export type TtsStatus = 'idle' | 'speaking' | 'paused' | 'done'

export interface TtsState {
  status: TtsStatus
  /** Indice del bloque en curso; -1 en idle. */
  index: number
  total: number
}

export type TtsAction =
  | { type: 'start'; total: number; at?: number }
  | { type: 'finished' }
  | { type: 'next' }
  | { type: 'pause' }
  | { type: 'resume'; native: boolean }
  | { type: 'stop' }

export const TTS_IDLE: TtsState = { status: 'idle', index: -1, total: 0 }

export function ttsReducer(state: TtsState, action: TtsAction): TtsState {
  switch (action.type) {
    case 'start': {
      const at = Math.max(0, action.at ?? 0)
      if (action.total <= 0 || at >= action.total) return { status: 'done', index: -1, total: action.total }
      return { status: 'speaking', index: at, total: action.total }
    }
    case 'finished':
    case 'next':
      if (state.status !== 'speaking' && state.status !== 'paused') return state
      return advance(state)
    case 'pause':
      return state.status === 'speaking' ? { ...state, status: 'paused' } : state
    case 'resume':
      if (state.status !== 'paused') return state
      return action.native ? { ...state, status: 'speaking' } : advance(state)
    case 'stop':
      return { status: 'idle', index: -1, total: state.total }
  }
}

function advance(state: TtsState): TtsState {
  const next = state.index + 1
  return next < state.total ? { ...state, status: 'speaking', index: next } : { ...state, status: 'done', index: -1 }
}

export interface TtsItem {
  blockId: string
  text: string
  kind: BlockKind
  /** `character:zahira`, `npc:osric`; null en narracion, sistema y tiradas sin actor. */
  speakerRef: string | null
}

function speakerRefOf(block: TurnBlock): string | null {
  if (block.kind === 'dialogue') return block.speaker.ref
  if (block.kind === 'roll') return block.actor?.ref ?? null
  return null
}

/** Lo que el TTS lee de un array de bloques, en orden, sin bloques vacios. */
export function speechQueue(blocks: readonly TurnBlock[]): TtsItem[] {
  return blocks.map((block) => ({ blockId: block.id, text: speechTextOf(block), kind: block.kind, speakerRef: speakerRefOf(block) })).filter((item) => item.text.trim().length > 0)
}

export interface TtsController {
  getState(): TtsState
  /** Bloque en curso, o null. */
  current(): TtsItem | null
  start(at?: number): void
  next(): void
  pause(): void
  resume(): void
  stop(): void
  subscribe(listener: (state: TtsState) => void): () => void
  /** true si el motor ofrece pausa nativa (iOS, web). */
  readonly nativePause: boolean
}

export function createTtsController(engine: SpeechEngine, items: readonly TtsItem[]): TtsController {
  let state: TtsState = TTS_IDLE
  let token = 0
  const listeners = new Set<(state: TtsState) => void>()
  const nativePause = typeof engine.pause === 'function' && typeof engine.resume === 'function'

  const emit = (): void => {
    for (const listener of listeners) listener(state)
  }

  const speakCurrent = (): void => {
    const item = items[state.index]
    if (!item) return
    const mine = ++token
    engine.speak(
      item.text,
      () => {
        if (mine !== token) return
        dispatch({ type: 'finished' })
      },
      item,
    )
  }

  const dispatch = (action: TtsAction): void => {
    const previous = state
    state = ttsReducer(state, action)
    if (state === previous) return

    const startedSpeaking = state.status === 'speaking' && (previous.status !== 'speaking' || previous.index !== state.index)
    const resumedNatively = action.type === 'resume' && action.native

    if (action.type === 'stop' || (action.type === 'pause' && !nativePause) || (action.type === 'next' && previous.status === 'speaking')) {
      token += 1
      engine.stop()
    }
    if (action.type === 'pause' && nativePause) engine.pause?.()
    if (resumedNatively) engine.resume?.()
    if (state.status === 'done') {
      token += 1
      if (previous.status === 'paused' && nativePause) engine.stop()
    }
    if (startedSpeaking && !resumedNatively) speakCurrent()
    emit()
  }

  return {
    nativePause,
    getState: () => state,
    current: () => (state.index >= 0 ? (items[state.index] ?? null) : null),
    start: (at = 0) => {
      if (state.status === 'speaking' || state.status === 'paused') dispatch({ type: 'stop' })
      dispatch({ type: 'start', total: items.length, at })
    },
    next: () => dispatch({ type: 'next' }),
    pause: () => dispatch({ type: 'pause' }),
    resume: () => dispatch({ type: 'resume', native: nativePause }),
    stop: () => dispatch({ type: 'stop' }),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
