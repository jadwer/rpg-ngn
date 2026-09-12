import { createTtsController, speechQueue, type TtsController, type TtsItem, type TtsState, type TurnBlock } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { storage } from '../online/storage'
import { createExpoSpeechEngine, listSpanishVoices, previewVoice } from '../speech/expoSpeechEngine'
import { clampPitch, clampRate, DEFAULT_VOICE_SETTINGS, pickVoice, type VoiceInfo, type VoiceSettings } from '../speech/voices'

export interface Tts {
  state: TtsState
  currentBlockId: string | null
  /** Bloques con texto que la cola puede leer. */
  count: number
  nativePause: boolean
  error: string | null
  start: (blockId?: string) => void
  next: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  /** Voces en español del telefono; vacia si no hay ninguna, null mientras se consultan o si el sistema no contesto. */
  voices: VoiceInfo[] | null
  /** La voz elegida si sigue instalada; null deja la voz por defecto del sistema. */
  voice: VoiceInfo | null
  settings: VoiceSettings
  setVoiceId: (id: string | null) => void
  setRate: (rate: number) => void
  setNarratorPitch: (pitch: number) => void
  /** Lee una frase de muestra con una voz (o la del sistema) y el tono del narrador. */
  preview: (voice: VoiceInfo | null) => void
  /** Leer solos los bloques que lleguen (modo online); se recuerda por telefono. */
  autoRead: boolean
  setAutoRead: (value: boolean) => void
  /** true si el telefono no tiene voz en español y el aviso no se ha descartado aun. */
  noSpanishVoice: boolean
  dismissVoiceNotice: () => void
}

export interface TtsOptions {
  /** Ofrecer "leer lo nuevo" (modo online). Sin esto el interruptor no aplica. */
  autoRead?: boolean
}

/**
 * Cola de TTS sobre los bloques de la pantalla. Offline los bloques no
 * cambian; online llegan por polling. Si llegan mientras se esta leyendo,
 * la cola vigente sigue hasta el final y la nueva se adopta al terminar; con
 * "leer lo nuevo" la lectura continua sola desde el primer bloque nuevo.
 * Voz, velocidad, tono del narrador y el interruptor se recuerdan en el
 * almacen del telefono.
 */
export function useTts(blocks: readonly TurnBlock[], options: TtsOptions = {}): Tts {
  const [error, setError] = useState<string | null>(null)
  const [voices, setVoices] = useState<VoiceInfo[] | null>(null)
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS)
  const [autoRead, setAutoReadState] = useState(false)
  const [noticeSeen, setNoticeSeen] = useState(true)
  const controllerRef = useRef<TtsController | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    let alive = true
    void Promise.all([storage.voiceSettings(), storage.autoRead(), storage.voiceNoticeSeen(), listSpanishVoices()]).then(([saved, auto, seen, list]) => {
      if (!alive) return
      setSettings(saved)
      setAutoReadState(auto)
      setNoticeSeen(seen)
      setVoices(list)
    })
    return () => {
      alive = false
    }
  }, [])

  const engine = useMemo(
    () =>
      createExpoSpeechEngine({
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
  const autoReadRef = useRef(false)
  autoReadRef.current = (options.autoRead ?? false) && autoRead

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

  const update = useCallback((patch: Partial<VoiceSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      void storage.setVoiceSettings(next)
      return next
    })
  }, [])

  const currentBlockId = state.index >= 0 ? (items[state.index]?.blockId ?? null) : null
  const voice = useMemo(() => pickVoice(voices ?? [], settings.voiceId), [voices, settings.voiceId])

  return {
    state,
    currentBlockId,
    count: items.length,
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
    voices,
    voice,
    settings,
    setVoiceId: (id) => update({ voiceId: id }),
    setRate: (rate) => update({ rate: clampRate(rate) }),
    setNarratorPitch: (pitch) => update({ narratorPitch: clampPitch(pitch) }),
    preview: (target) => {
      controller.stop()
      previewVoice(target, settingsRef.current)
    },
    autoRead,
    setAutoRead: (value) => {
      setAutoReadState(value)
      void storage.setAutoRead(value)
    },
    noSpanishVoice: voices !== null && voices.length === 0 && !noticeSeen,
    dismissVoiceNotice: () => {
      setNoticeSeen(true)
      void storage.setVoiceNoticeSeen()
    },
  }
}
