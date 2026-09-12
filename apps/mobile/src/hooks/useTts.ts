import { clampPitch, clampRate, createTtsController, DEFAULT_VOICE_SETTINGS, speechQueue, type ReadingLanguage, type TtsController, type TtsItem, type TtsState, type TurnBlock, type VoiceSettings } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { storage } from '../online/storage'
import { createExpoSpeechEngine, listVoices, previewVoice } from '../speech/expoSpeechEngine'
import { pickVoice, type VoiceInfo } from '../speech/voices'

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
  /** Voces del telefono en el idioma de lectura; vacia si no hay ninguna, null mientras se consultan o si el sistema no contesto. */
  voices: VoiceInfo[] | null
  /** La voz elegida si sigue instalada; null deja la voz por defecto del sistema. */
  voice: VoiceInfo | null
  settings: VoiceSettings
  setVoiceId: (id: string | null) => void
  setRate: (rate: number) => void
  setNarratorPitch: (pitch: number) => void
  /** Idioma de lectura: filtra las voces y fija el de la locucion; cambiarlo olvida la voz elegida. */
  setLang: (lang: ReadingLanguage) => void
  /** Lee una frase de muestra con una voz (o la del sistema) y el tono del narrador. */
  preview: (voice: VoiceInfo | null) => void
  /** Leer solos los bloques que lleguen (modo online); se recuerda por telefono. */
  autoRead: boolean
  setAutoRead: (value: boolean) => void
  /** true si el telefono no tiene voz en el idioma de lectura y el aviso no se ha descartado aun. */
  noVoiceInLanguage: boolean
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
 * Voz, velocidad, tono del narrador, idioma y el interruptor se recuerdan
 * en el almacen del telefono.
 */
export function useTts(blocks: readonly TurnBlock[], options: TtsOptions = {}): Tts {
  const [error, setError] = useState<string | null>(null)
  const [voices, setVoices] = useState<VoiceInfo[] | null>(null)
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [autoRead, setAutoReadState] = useState(false)
  const [noticeSeen, setNoticeSeen] = useState(true)
  const controllerRef = useRef<TtsController | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    let alive = true
    void Promise.all([storage.voiceSettings(), storage.autoRead(), storage.voiceNoticeSeen()]).then(([saved, auto, seen]) => {
      if (!alive) return
      setSettings(saved)
      setAutoReadState(auto)
      setNoticeSeen(seen)
      setSettingsLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [])

  // Las voces dependen del idioma de lectura; se consultan cuando ya se sabe cual es y cada vez que cambia.
  useEffect(() => {
    if (!settingsLoaded) return
    let alive = true
    setVoices(null)
    void listVoices(settings.lang).then((list) => {
      if (alive) setVoices(list)
    })
    return () => {
      alive = false
    }
  }, [settingsLoaded, settings.lang])

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
    // Las voces del idioma anterior ya no valen: se vuelve a elegir entre las nuevas.
    setLang: (lang) => update({ lang, voiceId: null }),
    preview: (target) => {
      controller.stop()
      previewVoice(target, settingsRef.current)
    },
    autoRead,
    setAutoRead: (value) => {
      setAutoReadState(value)
      void storage.setAutoRead(value)
    },
    noVoiceInLanguage: voices !== null && voices.length === 0 && !noticeSeen,
    dismissVoiceNotice: () => {
      setNoticeSeen(true)
      void storage.setVoiceNoticeSeen()
    },
  }
}
