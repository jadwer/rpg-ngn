'use client'

import { dialogue, narration, PITCH_MAX, PITCH_MIN, PITCH_STEP, RATE_MAX, RATE_MIN, RATE_STEP, READING_LANGUAGES, type ReadingLanguage } from '@rpg-ngn/ui-logic'
import { useMemo } from 'react'
import { RequireSession } from '../../components/RequireSession'
import { UserBar } from '../../components/UserBar'
import type { StoredUser } from '../../lib/storage'
import { useTts } from '../../lib/useTts'

export default function SettingsPage() {
  return <RequireSession>{({ user, logout }) => <Settings user={user} logout={logout} />}</RequireSession>
}

/** La prueba lee narracion, un dialogo de la party y uno de un NPC, para oir los tres tonos. */
const SAMPLE = [
  narration('sample-narration', 'La posada huele a estofado y a leña húmeda. Afuera, la campana del pueblo suena tres veces, aunque nadie la está tocando.'),
  dialogue('sample-party', { ref: 'character:zahira', name: 'Zahira', portrait: null }, 'Yo voy a ver qué pasa con esa campana.'),
  dialogue('sample-npc', { ref: 'npc:posadero', name: 'El posadero', portrait: null }, 'Yo que ustedes no saldría a estas horas.'),
]

/**
 * Ajustes del usuario: voz por defecto, idioma de lectura, velocidad, tono
 * del narrador y lectura automatica. Viven en localStorage (son del
 * navegador, no de la cuenta); la barra de voz de la mesa es el acceso
 * rapido a los mismos.
 */
function Settings({ user, logout }: { user: StoredUser; logout: () => void }) {
  const blocks = useMemo(() => SAMPLE, [])
  const tts = useTts(blocks)
  const speaking = tts.state.status === 'speaking'

  return (
    <main className="page narrow">
      <UserBar title="Ajustes" user={user} onLogout={logout} />

      <section className="card stack">
        <div className="label" style={{ marginTop: 0 }}>
          Voz de la narración
        </div>
        {!tts.supported ? <p className="hint">Este navegador no tiene síntesis de voz; la mesa se juega leyendo.</p> : null}

        <label className="field">
          <span>Idioma de lectura</span>
          <select className="select" name="idioma" value={tts.lang} onChange={(e) => tts.setLang(e.target.value as ReadingLanguage)}>
            {READING_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
            Filtra las voces del navegador. El DM narra en el idioma de la mesa; esto solo cambia con qué voz se lee.
          </span>
        </label>

        <label className="field">
          <span>Voz por defecto</span>
          <select className="select" name="voz" value={tts.voiceUri ?? ''} onChange={(e) => tts.setVoiceUri(e.target.value || null)} disabled={tts.voices.length === 0}>
            {tts.voices.length === 0 ? <option value="">{tts.voicesReady ? 'Sin voces en este idioma' : 'Cargando voces...'}</option> : null}
            {tts.voices.map((voice) => (
              <option key={voice.uri} value={voice.uri}>
                {voice.name} ({voice.lang}){voice.local ? '' : ', en línea'}
              </option>
            ))}
          </select>
          <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
            Se elige de oído: el navegador no dice si la voz es grave o aguda. En iPhone, Ajustes, Accesibilidad, Contenido leído, Voces, permite descargar más voces en español.
          </span>
        </label>

        <label className="field">
          <span>Velocidad</span>
          <div className="row">
            <input type="range" min={RATE_MIN} max={RATE_MAX} step={RATE_STEP} value={tts.rate} onChange={(e) => tts.setRate(Number(e.target.value))} style={{ flex: 1 }} />
            <span className="muted">{tts.rate.toFixed(2)}x</span>
          </div>
        </label>

        <label className="field">
          <span>Tono del narrador</span>
          <div className="row">
            <input type="range" min={PITCH_MIN} max={PITCH_MAX} step={PITCH_STEP} value={tts.narratorPitch} onChange={(e) => tts.setNarratorPitch(Number(e.target.value))} style={{ flex: 1 }} />
            <span className="muted">{tts.narratorPitch.toFixed(2)}</span>
          </div>
          <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
            Más bajo suena más grave. Los personajes de la party hablan con el tono normal y cada NPC lleva el suyo, siempre el mismo.
          </span>
        </label>

        <label className="check">
          <input type="checkbox" checked={tts.autoRead} onChange={(e) => tts.setAutoRead(e.target.checked)} />
          Leer lo nuevo en voz alta cuando el DM narra
        </label>

        <div className="row">
          {!speaking ? (
            <button type="button" className="btn primary" onClick={() => tts.start()} disabled={!tts.supported}>
              Escuchar una prueba
            </button>
          ) : (
            <button type="button" className="btn" onClick={tts.stop}>
              Parar
            </button>
          )}
          {tts.error ? <span className="error">Voz: {tts.error}</span> : <span className="hint">Se guarda en este navegador.</span>}
        </div>
      </section>

      <section className="card stack" style={{ marginTop: 16 }}>
        <div className="label" style={{ marginTop: 0 }}>
          Del DM de cada mesa
        </div>
        <p className="hint">El proveedor del director de juego (Anthropic, OpenAI, DeepSeek, Ollama o el DM con guion) se elige por mesa, en el mando del anfitrión, pestaña DM.</p>
      </section>
    </main>
  )
}
