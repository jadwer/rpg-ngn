'use client'

import type { Tts } from '../lib/useTts'

/** Controles de la narracion por voz: leer, pausa o seguir, siguiente, parar, voz, velocidad y leer lo nuevo. */
export function TtsBar({ tts }: { tts: Tts }) {
  const { state } = tts
  const active = state.status === 'speaking' || state.status === 'paused'
  const status =
    state.status === 'speaking'
      ? `Leyendo ${state.index + 1} de ${state.total}`
      : state.status === 'paused'
        ? `En pausa (${state.index + 1} de ${state.total})`
        : state.status === 'done'
          ? 'Lectura terminada'
          : ''

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
      <select id="tts-voice" className="select" value={tts.voiceUri ?? ''} onChange={(e) => tts.setVoiceUri(e.target.value || null)} disabled={tts.voices.length === 0} title="Voz en español del navegador">
        {tts.voices.length === 0 ? <option value="">{tts.voicesReady ? 'Sin voces en español' : 'Cargando voces...'}</option> : null}
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
      {tts.error ? <span className="status">Voz: {tts.error}</span> : status ? <span className="status">{status}</span> : null}
    </div>
  )
}
