'use client'

import { t } from '@rpg-ngn/i18n'
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
    return <div className="tts status">{t('ttsBar.esteNavegadorNoTiene')}</div>
  }

  return (
    <div className="tts">
      {!active ? (
        <button type="button" className="btn small primary" onClick={() => tts.start()} disabled={tts.count === 0}>
          {t('ttsBar.leer')}
        </button>
      ) : null}
      {state.status === 'speaking' ? (
        <button type="button" className="btn small" onClick={tts.pause}>
          {t('ttsBar.pausa')}
        </button>
      ) : null}
      {state.status === 'paused' ? (
        <button type="button" className="btn small primary" onClick={tts.resume}>
          {t('ttsBar.seguir')}
        </button>
      ) : null}
      {active ? (
        <button type="button" className="btn small" onClick={tts.next}>
          {t('ttsBar.siguiente')}
        </button>
      ) : null}
      {active ? (
        <button type="button" className="btn small" onClick={tts.stop}>
          {t('ttsBar.parar')}
        </button>
      ) : null}
      {/*
        En el telefono todo esto se esconde (`.tts-fino`, globals.css): son
        ajustes finos de lectura y, apilados, empujaban la narracion fuera de
        la primera pantalla. Los mismos estan completos en /ajustes.
      */}
      <label className="sr-only" htmlFor="tts-voice">
        {t('ttsBar.voz')}
      </label>
      <select id="tts-voice" className="select tts-fino" value={tts.voiceUri ?? ''} onChange={(e) => tts.setVoiceUri(e.target.value || null)} disabled={tts.voices.length === 0} title={t('ttsBar.vozDelNavegadorEn')}>
        {tts.voices.length === 0 ? <option value="">{tts.voicesReady ? t('play.noVoices') : t('play.loadingVoices')}</option> : null}
        {tts.voices.map((voice) => (
          <option key={voice.uri} value={voice.uri}>
            {voice.name} ({voice.lang})
          </option>
        ))}
      </select>
      <label className="rate tts-fino" title={t('ttsBar.velocidadDeLectura')}>
        <span>{t('ttsBar.velocidad')}</span>
        <input type="range" min={0.7} max={1.4} step={0.05} value={tts.rate} onChange={(e) => tts.setRate(Number(e.target.value))} />
        <span>{tts.rate.toFixed(2)}x</span>
      </label>
      <label className="check tts-fino">
        <input type="checkbox" checked={tts.autoRead} onChange={(e) => tts.setAutoRead(e.target.checked)} />
        {t('ttsBar.leerLoNuevo')}
      </label>
      {narrator.label ? <span className="status narrating">{narrator.label}</span> : null}
      <span className={`status tts-fino${summary.warn ? ' warn' : ''}`}>{summary.text}</span>
      {warnNobody ? (
        <button type="button" className="btn ghost small tts-fino" onClick={narrator.dismiss} title={t('ttsBar.quitarElAvisoDe')}>
          {t('ttsBar.jugamosLeyendo')}
        </button>
      ) : null}
      {narrator.flag.dismissed && !narrator.flag.someoneNarrating && !active ? (
        <button type="button" className="btn ghost small tts-fino" onClick={narrator.restore} title={t('ttsBar.volverAAvisarSi')}>
          {t('ttsBar.avisarSiNadieNarra')}
        </button>
      ) : null}
      <Link href="/ajustes" className="btn ghost small tts-fino" title={t('ttsBar.vozPorDefectoIdioma')}>
        {t('ttsBar.ajustes')}
      </Link>
    </div>
  )
}
