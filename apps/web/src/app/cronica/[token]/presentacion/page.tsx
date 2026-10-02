'use client'

import { language, t } from '@rpg-ngn/i18n'
import { createApiClient, normalizeBaseUrl, type Chronicle } from '@rpg-ngn/api-client'
import { SUBTITLE_CHARS, SUBTITLE_LINES, buildSlides, captionAt, captionsFor, estimateSeconds, presentationFormat, type Slide } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WEB_HEADER, useSession } from '../../../../lib/session'
import { listVoices } from '../../../../lib/webSpeech'

/** Segundos del titulo al empezar y del cierre al terminar, como en el video. */
const TITLE_SECONDS = 5
const OUTRO_SECONDS = 4

/**
 * La cronica como presentacion (02-10, Gabino): el aspecto del video de la
 * sesion (vertical para redes, horizontal para YouTube) pero reproducida en
 * el navegador, sin generar nada en el servidor. Quien quiera el video la
 * graba con OBS o la grabadora del telefono; por eso al reproducir no queda
 * ningun boton en pantalla. Con la voz del narrador si ya se genero; si no,
 * la del navegador.
 */
export default function PresentacionPage() {
  return (
    <Suspense fallback={<main className="presentacion" />}>
      <Presentacion />
    </Suspense>
  )
}

function Presentacion() {
  const params = useParams<{ token: string }>()
  const query = useSearchParams()
  const token = typeof params.token === 'string' ? params.token : ''
  const format = presentationFormat(query.get('formato'))
  const session = useSession()
  const [chronicle, setChronicle] = useState<Chronicle | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!token) return
    const client = createApiClient({
      baseUrl: normalizeBaseUrl(session.serverUrl),
      tokenProvider: () => null,
      fetch: (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...WEB_HEADER }, credentials: 'omit' }),
    })
    client.chronicle(token).then(setChronicle, () => setMissing(true))
  }, [token, session.serverUrl])

  const slides = useMemo(() => (chronicle ? buildSlides(chronicle, query.get('sesion')) : []), [chronicle, query])

  if (missing) {
    return (
      <main className="page narrow cronica">
        <h1>{t('chroniclePage.estaHistoriaNoSe')}</h1>
        <p className="hint">{t('chroniclePage.elEnlaceNoExiste')}</p>
      </main>
    )
  }
  if (!chronicle) return <main className="presentacion" />

  return <Player chronicle={chronicle} slides={slides} format={format} token={token} />
}

type Phase = 'ready' | 'playing' | 'paused' | 'done'

function Player({ chronicle, slides, format, token }: { chronicle: Chronicle; slides: Slide[]; format: 'vertical' | 'horizontal'; token: string }) {
  const [phase, setPhase] = useState<Phase>('ready')
  // `slides.length` es el cierre.
  const [index, setIndex] = useState(0)
  const [caption, setCaption] = useState(0)
  const [seconds, setSeconds] = useState(6)
  const [titleOn, setTitleOn] = useState(true)
  // Cada "Comenzar" u "Otra vez" es una corrida nueva; pausar no reinicia nada.
  const [run, setRun] = useState(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const paused = useRef(false)
  const captionNow = useRef(0)
  // Como se retoma lo que sonaba: lo define la reproduccion de cada diapositiva.
  const resume = useRef<() => void>(() => undefined)
  const router = useRouter()

  const slide = index < slides.length ? slides[index]! : null
  const captions = useMemo(() => (slide ? captionsFor(slide.text, SUBTITLE_CHARS[format], SUBTITLE_LINES[format]) : []), [slide, format])
  // La ilustracion del cierre es la ultima que se vio.
  const image = slide?.image ?? slides[slides.length - 1]?.image ?? null

  const showCaption = useCallback((at: number) => {
    captionNow.current = at
    setCaption(at)
  }, [])

  const stopAll = useCallback(() => {
    audio.current?.pause()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const next = useCallback(() => {
    if (paused.current) return
    timer.current = setTimeout(() => {
      captionNow.current = 0
      setCaption(0)
      setIndex((i) => i + 1)
    }, 350)
  }, [])

  // Reproduce la diapositiva actual. No depende de la pausa: pausar y seguir
  // no la vuelven a empezar (antes, Seguir reiniciaba el bloque, 02-10).
  useEffect(() => {
    if (run === 0) return
    if (index >= slides.length) {
      setSeconds(OUTRO_SECONDS)
      const finish = () => {
        timer.current = setTimeout(() => {
          setPhase('done')
          // Al terminar se sale de la pantalla completa: en el telefono no hay tecla Esc.
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
        }, OUTRO_SECONDS * 1000)
      }
      resume.current = finish
      finish()
      return () => {
        if (timer.current) clearTimeout(timer.current)
      }
    }
    const current = slides[index]!
    if (current.audioUrl) {
      const el = audio.current ?? (audio.current = new Audio())
      el.src = current.audioUrl
      el.onloadedmetadata = () => setSeconds(Number.isFinite(el.duration) ? el.duration + 0.35 : estimateSeconds(current.text))
      el.ontimeupdate = () => showCaption(captionAt(captions, el.duration ? el.currentTime / el.duration : 0))
      el.onended = next
      resume.current = () => void el.play().catch(next)
      void el.play().catch(next)
      return () => {
        el.onended = null
        el.ontimeupdate = null
      }
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // La voz del navegador lee subtitulo por subtitulo: en Android no avisa
      // por que palabra va (el texto se quedaba en el primero) y no sabe
      // pausar, solo cortar; pausar la corta y Seguir retoma ese subtitulo.
      setSeconds(estimateSeconds(current.text))
      const lang = language()
      const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === listVoices(lang)[0]?.uri)
      let alive = true
      const say = (at: number) => {
        if (!alive || paused.current) return
        if (at >= captions.length) {
          next()
          return
        }
        showCaption(at)
        const line = captions[at]!.lines.join(' ')
        const utterance = new SpeechSynthesisUtterance(at === 0 && current.speaker ? `${current.speaker}. ${line}` : line)
        if (voice) utterance.voice = voice
        utterance.lang = lang === 'en' ? 'en-US' : 'es-MX'
        utterance.onend = () => say(at + 1)
        window.speechSynthesis.speak(utterance)
      }
      resume.current = () => {
        window.speechSynthesis.cancel()
        say(captionNow.current)
      }
      say(0)
      return () => {
        alive = false
      }
    }
    setSeconds(estimateSeconds(current.text))
    const wait = () => {
      timer.current = setTimeout(next, estimateSeconds(current.text) * 1000)
    }
    resume.current = wait
    wait()
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [run, index, slides, captions, next, showCaption])

  useEffect(() => {
    if (run === 0 || index !== 0) return
    const id = setTimeout(() => setTitleOn(false), TITLE_SECONDS * 1000)
    return () => clearTimeout(id)
  }, [run, index])

  useEffect(() => stopAll, [stopAll])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const start = () => {
    paused.current = false
    stopAll()
    setIndex(0)
    showCaption(0)
    setTitleOn(true)
    setPhase('playing')
    setRun((r) => r + 1)
    void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  function toggle() {
    if (phase === 'playing') {
      paused.current = true
      stopAll()
      setPhase('paused')
    } else if (phase === 'paused') {
      paused.current = false
      setPhase('playing')
      resume.current()
    }
  }

  /** Salir: en el telefono deslizar desde arriba no quita la pantalla completa (Gabino, 02-10). */
  const leave = () => {
    stopAll()
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    router.push(`/cronica/${token}`)
  }

  const current = captions[caption]
  const outro = index >= slides.length

  return (
    <main className={`presentacion ${format}${phase === 'playing' ? ' grabando' : ''}`} onClick={phase === 'playing' || phase === 'paused' ? toggle : undefined}>
      <div className="escenario" style={{ ['--dur' as string]: `${seconds}s` }}>
        {image ? (
          <>
            {format === 'vertical' ? <img src={image} alt="" className="fondo" /> : null}
            <div className="cuadro">
              <img key={`${index}-${run}`} src={image} alt="" className={`kenburns k${index % 3}${phase === 'paused' ? ' pausado' : ''}`} />
            </div>
          </>
        ) : null}
        {titleOn && phase !== 'ready' ? <div className="titulo">{chronicle.title}</div> : null}
        {outro && phase !== 'ready' ? (
          <div className="cierre">
            {t('chroniclePage.outro')}
            <small>adastramentis.com</small>
          </div>
        ) : null}
        {!outro && current && phase !== 'ready' ? (
          <p className="subtitulo">
            {slide?.speaker && caption === 0 ? <b>{slide.speaker}: </b> : null}
            {current.lines.map((line, i) => (
              <span key={i}>
                {line}
                {i < current.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        ) : null}

        {phase === 'paused' ? (
          <div className="pausa" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn primary" onClick={toggle}>
              ▶ {t('chroniclePage.seguir')}
            </button>
            <button type="button" className="btn ghost small" onClick={start}>
              {t('chroniclePage.otraVez')}
            </button>
            <button type="button" className="btn ghost small" onClick={leave}>
              {t('chroniclePage.salir')}
            </button>
          </div>
        ) : null}

        {phase === 'ready' || phase === 'done' ? (
          <div className="portada" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">{chronicle.pack.name ?? 'Ad Astra Mentis'}</p>
            <h1>{chronicle.title}</h1>
            <button type="button" className="btn primary" onClick={start}>
              ▶ {phase === 'done' ? t('chroniclePage.otraVez') : t('chroniclePage.comenzar')}
            </button>
            <p className="hint">{t('chroniclePage.presentacionAyuda')}</p>
            <Link href={`/cronica/${token}`} className="btn ghost small">
              {t('chroniclePage.volverALaHistoria')}
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  )
}
