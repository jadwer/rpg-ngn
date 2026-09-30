'use client'

import { t } from '@rpg-ngn/i18n'
import { dialogue, narration, PITCH_MAX, PITCH_MIN, PITCH_STEP, RATE_MAX, RATE_MIN, RATE_STEP, READING_LANGUAGES, type ReadingLanguage } from '@rpg-ngn/ui-logic'
import { useMemo } from 'react'
import { RequireSession } from '../../components/RequireSession'
import { AppShell } from '../../components/shell/AppShell'
import { useTts } from '../../lib/useTts'

export default function SettingsPage() {
  return (
    <RequireSession>
      {({ user, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <Settings />
        </AppShell>
      )}
    </RequireSession>
  )
}

/** La prueba lee narracion, un dialogo de la party y uno de un NPC, para oir los tres tonos. */
// Una funcion y no una constante: el texto sale en el idioma vigente (i18n).
const sample = () => [
  narration('sample-narration', t('play.sampleNarration')),
  dialogue('sample-party', { ref: 'character:zahira', name: 'Zahira', portrait: null }, t('play.sampleParty')),
  dialogue('sample-npc', { ref: 'npc:posadero', name: t('play.sampleNpcName'), portrait: null }, t('play.sampleNpc')),
]

/**
 * Voz: voz por defecto, idioma de lectura, velocidad, tono del narrador y
 * lectura automatica. Viven en localStorage (son del navegador, no de la
 * cuenta); la barra de voz de la mesa es el acceso rapido a los mismos. Los
 * creditos y la clave propia estan en /perfil (docs/18, D-UX-7).
 */
function Settings() {
  const blocks = useMemo(() => sample(), [])
  const tts = useTts(blocks)
  const speaking = tts.state.status === 'speaking'

  return (
    <div className="page en-shell narrow">
      <h1 className="pagina-titulo">{t('voicePage.voz')}</h1>

      <section className="card stack">
        <div className="label" style={{ marginTop: 0 }}>
          {t('voicePage.vozDeLaNarracion')}
        </div>
        {!tts.supported ? <p className="hint">Este navegador no tiene síntesis de voz; la mesa se juega leyendo.</p> : null}

        <label className="field">
          <span>{t('voicePage.idiomaDeLectura')}</span>
          <select className="select" name="idioma" value={tts.lang} onChange={(e) => tts.setLang(e.target.value as ReadingLanguage)}>
            {READING_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
            Filtra las voces del navegador. El GM narra en el idioma de la mesa; esto solo cambia con qué voz se lee.
          </span>
        </label>

        <label className="field">
          <span>{t('voicePage.vozPorDefecto')}</span>
          <select className="select" name="voz" value={tts.voiceUri ?? ''} onChange={(e) => tts.setVoiceUri(e.target.value || null)} disabled={tts.voices.length === 0}>
            {tts.voices.length === 0 ? <option value="">{tts.voicesReady ? t('play.noVoices') : t('play.loadingVoices')}</option> : null}
            {tts.voices.map((voice) => (
              <option key={voice.uri} value={voice.uri}>
                {voice.name} ({voice.lang}){voice.local ? '' : ', en línea'}
              </option>
            ))}
          </select>
          <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
            {t('voicePage.seEligeDeOido')}
          </span>
        </label>

        <label className="field">
          <span>{t('voicePage.velocidad')}</span>
          <div className="row">
            <input type="range" min={RATE_MIN} max={RATE_MAX} step={RATE_STEP} value={tts.rate} onChange={(e) => tts.setRate(Number(e.target.value))} style={{ flex: 1 }} />
            <span className="muted">{tts.rate.toFixed(2)}x</span>
          </div>
        </label>

        <label className="field">
          <span>{t('voicePage.tonoDelNarrador')}</span>
          <div className="row">
            <input type="range" min={PITCH_MIN} max={PITCH_MAX} step={PITCH_STEP} value={tts.narratorPitch} onChange={(e) => tts.setNarratorPitch(Number(e.target.value))} style={{ flex: 1 }} />
            <span className="muted">{tts.narratorPitch.toFixed(2)}</span>
          </div>
          <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
            {t('voicePage.masBajoSuenaMas')}
          </span>
        </label>

        <label className="check">
          <input type="checkbox" checked={tts.autoRead} onChange={(e) => tts.setAutoRead(e.target.checked)} />
          {t('voicePage.leerLoNuevoEn')}
        </label>

        <div className="row">
          {!speaking ? (
            <button type="button" className="btn primary" onClick={() => tts.start()} disabled={!tts.supported}>
              {t('voicePage.escucharUnaPrueba')}
            </button>
          ) : (
            <button type="button" className="btn" onClick={tts.stop}>
              {t('voicePage.parar')}
            </button>
          )}
          {tts.error ? <span className="error">Voz: {tts.error}</span> : <span className="hint">{t('voicePage.seGuardaEnEste')}</span>}
        </div>
      </section>
    </div>
  )
}
