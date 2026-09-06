import { createTtsController, speechQueue, type TtsController, type TtsState, type TurnBlock } from '@rpg-ngn/ui-logic'
import { useEffect, useMemo, useRef, useState } from 'react'
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

/** Cola de TTS sobre los bloques de la sesion; se reinicia cuando cambian. */
export function useTts(blocks: readonly TurnBlock[]): Tts {
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

  const items = useMemo(() => speechQueue(blocks), [blocks])
  const controller = useMemo(() => createTtsController(engine, items), [engine, items])
  controllerRef.current = controller

  const [state, setState] = useState<TtsState>(controller.getState())
  useEffect(() => {
    setState(controller.getState())
    const unsubscribe = controller.subscribe(setState)
    return () => {
      unsubscribe()
      controller.stop()
    }
  }, [controller])

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
