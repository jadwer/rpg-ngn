import { createTtsController, speechQueue, type TtsController, type TtsItem, type TtsState, type TurnBlock } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createExpoSpeechEngine } from '../speech/expoSpeechEngine'

export interface Tts {
  state: TtsState
  currentBlockId: string | null
  nativePause: boolean
  error: string | null
  start: (blockId?: string) => void
  next: () => void
  pause: () => void
  resume: () => void
  stop: () => void
}

export interface TtsOptions {
  /** Leer en voz alta los bloques que lleguen despues de la primera carga (modo online). */
  autoRead?: boolean
}

/**
 * Cola de TTS sobre los bloques de la pantalla. Offline los bloques no
 * cambian; online llegan por polling. Si llegan mientras se esta leyendo,
 * la cola vigente sigue hasta el final y la nueva se adopta al terminar; con
 * `autoRead` la lectura continua sola desde el primer bloque nuevo.
 */
export function useTts(blocks: readonly TurnBlock[], options: TtsOptions = {}): Tts {
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<TtsController | null>(null)

  const engine = useMemo(
    () =>
      createExpoSpeechEngine({
        onError: (message) => {
          setError(message)
          controllerRef.current?.stop()
        },
      }),
    [],
  )

  const latest = useMemo(() => speechQueue(blocks), [blocks])
  const [items, setItems] = useState<TtsItem[]>(latest)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const pendingRef = useRef<TtsItem[] | null>(null)
  const startAtRef = useRef<number | null>(null)
  const readyRef = useRef(false)
  const autoReadRef = useRef(options.autoRead ?? false)
  autoReadRef.current = options.autoRead ?? false

  const adopt = useCallback((next: TtsItem[]) => {
    const previous = itemsRef.current
    const grew = next.length > previous.length && previous.every((item, index) => next[index]?.blockId === item.blockId)
    if (readyRef.current && grew && autoReadRef.current) startAtRef.current = previous.length
    readyRef.current = true
    if (next !== previous) setItems(next)
  }, [])

  useEffect(() => {
    const status = controllerRef.current?.getState().status
    if (status === 'speaking' || status === 'paused') {
      pendingRef.current = latest
      return
    }
    pendingRef.current = null
    adopt(latest)
  }, [latest, adopt])

  const controller = useMemo(() => createTtsController(engine, items), [engine, items])
  controllerRef.current = controller

  const [state, setState] = useState<TtsState>(controller.getState())
  useEffect(() => {
    setState(controller.getState())
    const unsubscribe = controller.subscribe((next) => {
      setState(next)
      if ((next.status === 'done' || next.status === 'idle') && pendingRef.current) {
        const pending = pendingRef.current
        pendingRef.current = null
        adopt(pending)
      }
    })
    if (startAtRef.current !== null) {
      const at = startAtRef.current
      startAtRef.current = null
      controller.start(at)
    }
    return () => {
      unsubscribe()
      controller.stop()
    }
  }, [controller, adopt])

  const currentBlockId = state.index >= 0 ? (items[state.index]?.blockId ?? null) : null

  return {
    state,
    currentBlockId,
    nativePause: controller.nativePause,
    error,
    start: (blockId) => {
      setError(null)
      const at = blockId ? items.findIndex((i) => i.blockId === blockId) : 0
      controller.start(at < 0 ? 0 : at)
    },
    next: () => controller.next(),
    pause: () => controller.pause(),
    resume: () => controller.resume(),
    stop: () => controller.stop(),
  }
}
