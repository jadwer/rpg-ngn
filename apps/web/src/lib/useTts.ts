'use client'

import { createTtsController, speechQueue, type TtsController, type TtsItem, type TtsState, type TurnBlock } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { storage } from './storage'
import { createWebSpeechEngine, pickVoice, speechSupported, watchVoices, type VoiceChoice } from './webSpeech'

export interface Tts {
  state: TtsState
  currentBlockId: string | null
  /** Bloques con texto que la cola puede leer. */
  count: number
  nativePause: boolean
  supported: boolean
  error: string | null
  start: (blockId?: string) => void
  next: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  /** Voces en español del navegador; vacia si no hay ninguna. */
  voices: VoiceChoice[]
  /** true cuando el navegador ya entrego su lista de voces. */
  voicesReady: boolean
  voiceUri: string | null
  setVoiceUri: (uri: string | null) => void
  rate: number
  setRate: (rate: number) => void
  autoRead: boolean
  setAutoRead: (value: boolean) => void
}

/**
 * La cola de TTS de ui-logic sobre los bloques de la mesa, con Web Speech.
 * Si llegan bloques mientras se lee, la cola vigente sigue hasta el final
 * y la nueva se adopta al terminar; con "leer lo nuevo" la lectura continua
 * sola desde el primer bloque nuevo. Voz, velocidad y el interruptor se
 * recuerdan en localStorage.
 */
export function useTts(blocks: readonly TurnBlock[]): Tts {
  const [error, setError] = useState<string | null>(null)
  const [voices, setVoices] = useState<VoiceChoice[]>([])
  const [voicesReady, setVoicesReady] = useState(false)
  const [voiceUri, setVoiceUriState] = useState<string | null>(null)
  const [rate, setRateState] = useState(1)
  const [autoRead, setAutoReadState] = useState(false)
  const controllerRef = useRef<TtsController | null>(null)
  const settingsRef = useRef({ voiceUri: null as string | null, rate: 1 })
  settingsRef.current = { voiceUri, rate }

  useEffect(() => {
    setVoiceUriState(storage.voice())
    setRateState(storage.rate())
    setAutoReadState(storage.autoRead())
    let first = true
    return watchVoices((list) => {
      setVoices(list)
      if (list.length > 0 || !first) setVoicesReady(true)
      first = false
    })
  }, [])

  // Cuando llegan las voces, se fija la guardada o la primera en español.
  useEffect(() => {
    if (voices.length === 0) return
    const chosen = pickVoice(voices, voiceUri)
    if (chosen && chosen.uri !== voiceUri) setVoiceUriState(chosen.uri)
  }, [voices, voiceUri])

  const engine = useMemo(
    () =>
      createWebSpeechEngine({
        settings: () => settingsRef.current,
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
  const autoReadRef = useRef(autoRead)
  autoReadRef.current = autoRead

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
    count: items.length,
    nativePause: controller.nativePause,
    supported: speechSupported(),
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
    voices,
    voicesReady,
    voiceUri,
    setVoiceUri: (uri) => {
      setVoiceUriState(uri)
      storage.setVoice(uri)
    },
    rate,
    setRate: (value) => {
      setRateState(value)
      storage.setRate(value)
    },
    autoRead,
    setAutoRead: (value) => {
      setAutoReadState(value)
      storage.setAutoRead(value)
    },
  }
}
