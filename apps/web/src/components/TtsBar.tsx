'use client'

import { nobodyNarrates, voiceLineSummary } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useNarrator } from '../lib/narrator'
import type { Tts } from '../lib/useTts'

/**
 * Controles de la narracion por voz: leer, pausa o seguir, siguiente, parar,
 * voz, velocidad, leer lo nuevo y la bandera de narrador (docs/09): quien
 * lee en voz alta en la mesa, o el aviso de que nadie lo hace.
 */
export function TtsBar({ tts }: { tts: Tts }) {
  const { state } = tts
  const narrator = useNarrator()
  const active = state.status === 'speaking' || state.status === 'paused'
  const localSpeaking = state.status === 'speaking'
  const summary = voiceLineSummary({ state, nativePause: tts.nativePause, error: tts.error, narrator: narrator.flag, autoRead: tts.autoRead, device: 'dispositivo' })
  const warnNobody = nobodyNarrates(narrator.flag, localSpeaking)

  if (!tts.supported) {
    return <div className="tts status">Este navegador no tiene voz. La mesa se juega leyendo.</div>
  }

  return (
    <div className="tts">
      {!active ? (
        <button type="button" className="btn small primary" onClick={() => tts.start()} disabled={tts.count === 0}>
          Leer
        </button>
      ) : null}
      {state.status === 'speaking' ? (
        <button type="button" className="btn small" onClick={tts.pause}>
          Pausa
        </button>
      ) : null}
      {state.status === 'paused' ? (
        <button type="button" className="btn small primary" onClick={tts.resume}>
          Seguir
        </button>
      ) : null}
      {active ? (
        <button type="button" className="btn small" onClick={tts.next}>
          Siguiente
        </button>
      ) : null}
      {active ? (
        <button type="button" className="btn small" onClick={tts.stop}>
          Parar
        </button>
      ) : null}
      <label className="sr-only" htmlFor="tts-voice">
        Voz
      </label>
      <select id="tts-voice" className="select" value={tts.voiceUri ?? ''} onChange={(e) => tts.setVoiceUri(e.target.value || null)} disabled={tts.voices.length === 0} title="Voz del navegador en el idioma de lectura">
        {tts.voices.length === 0 ? <option value="">{tts.voicesReady ? 'Sin voces en este idioma' : 'Cargando voces...'}</option> : null}
        {tts.voices.map((voice) => (
          <option key={voice.uri} value={voice.uri}>
            {voice.name} ({voice.lang})
          </option>
        ))}
      </select>
      <label className="rate" title="Velocidad de lectura">
        <span>Velocidad</span>
        <input type="range" min={0.7} max={1.4} step={0.05} value={tts.rate} onChange={(e) => tts.setRate(Number(e.target.value))} />
        <span>{tts.rate.toFixed(2)}x</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={tts.autoRead} onChange={(e) => tts.setAutoRead(e.target.checked)} />
        Leer lo nuevo
      </label>
      <label className="check" title={localSpeaking ? 'Este dispositivo está narrando' : 'Marca si otro dispositivo de la mesa lee en voz alta'}>
        <input type="checkbox" checked={narrator.flag.someoneNarrating} onChange={(e) => narrator.setSomeoneNarrating(e.target.checked)} disabled={localSpeaking} />
        Otro dispositivo narra
      </label>
      <span className={`status${summary.warn ? ' warn' : ''}`}>{summary.text}</span>
      {warnNobody ? (
        <button type="button" className="btn ghost small" onClick={narrator.dismiss} title="Quitar el aviso de que nadie narra">
          Jugamos leyendo
        </button>
      ) : null}
      {narrator.flag.dismissed && !narrator.flag.someoneNarrating && !active ? (
        <button type="button" className="btn ghost small" onClick={narrator.restore} title="Volver a avisar si nadie narra">
          Avisar si nadie narra
        </button>
      ) : null}
      <Link href="/ajustes" className="btn ghost small" title="Voz por defecto, idioma, velocidad y tono">
        Ajustes
      </Link>
    </div>
  )
}
