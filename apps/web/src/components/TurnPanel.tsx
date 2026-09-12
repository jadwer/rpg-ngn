'use client'

import type { TurnView } from '@rpg-ngn/api-client'
import type { TurnProgress } from '@rpg-ngn/ui-logic'
import { useState, type KeyboardEvent } from 'react'

/** Frase de estado del turno, con acentos (la de ui-logic va sin ellos). */
export function statusLine(turn: TurnView | null, progress: TurnProgress, nameOf: (id: string) => string): string {
  if (!turn) return 'No hay turno abierto.'
  if (progress.narrating) return 'El DM está narrando...'
  if (turn.status === 'resolved') return 'Turno resuelto.'
  if (progress.complete) return turn.required.length === 0 ? 'Nadie tiene pregunta directa; cualquiera puede cerrar.' : 'Todos respondieron; cualquiera puede cerrar el turno.'
  return `Faltan: ${progress.pending.map(nameOf).join(', ')}.`
}

interface Props {
  turn: TurnView | null
  progress: TurnProgress
  nameOf: (characterId: string) => string
  busy: boolean
  /** Ultimo aviso de una accion (409, 422, 403). */
  notice: string | null
  hasCharacter: boolean
  onRespond: (text: string) => Promise<boolean>
  onClose: (force: boolean) => void
}

/**
 * Cuadro de respuesta (docs/09): quien respondio y quien falta (nombres,
 * nunca textos), el cuadro para escribir si toca (Ctrl+Enter envia), y el
 * cierre cuando no falta nadie. Mientras el DM narra, solo el aviso.
 */
export function TurnPanel({ turn, progress, nameOf, busy, notice, hasCharacter, onRespond, onClose }: Props) {
  const [text, setText] = useState('')
  const line = statusLine(turn, progress, nameOf)

  const send = async () => {
    const value = text.trim()
    if (!value || busy) return
    if (await onRespond(value)) setText('')
  }

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <div className="turn">
      <div className={`status${progress.narrating ? ' narrating-line' : ''}`}>
        {progress.narrating ? <span className="spinner" aria-hidden /> : null}
        <span>{turn ? `Turno ${turn.number}: ${line}` : line}</span>
        {turn && !progress.narrating && (progress.responded.length > 0 || progress.pending.length > 0) ? (
          <span className="chips">
            {progress.responded.map((id) => (
              <span key={id} className="chip done">
                {nameOf(id)} ya respondió
              </span>
            ))}
            {progress.pending.map((id) => (
              <span key={id} className="chip">
                falta {nameOf(id)}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      {turn?.error ? <div className="error">El DM tuvo un problema y el turno se reabrió: {turn.error}</div> : null}
      {notice && notice !== turn?.error ? <div className="error">{notice}</div> : null}

      {progress.canRespond ? (
        <>
          <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="¿Qué haces? Escribe tu acción o di que no haces nada. Ctrl+Enter envía." disabled={busy} rows={3} />
          <div className="actions">
            <button type="button" className="btn primary" onClick={() => void send()} disabled={busy || text.trim().length === 0}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Enviar
            </button>
            <span className="hint">Ctrl+Enter también envía.</span>
          </div>
        </>
      ) : null}
      {turn && turn.status === 'open' && !hasCharacter ? <div className="hint">Miras la mesa sin personaje: puedes leer y cerrar el turno, pero no responder.</div> : null}
      {turn && progress.hasResponded && turn.status === 'open' ? <div className="sent">Tu respuesta está enviada.</div> : null}

      {progress.canClose || progress.canForceClose ? (
        <div className="actions">
          {progress.canClose ? (
            <button type="button" className="btn" onClick={() => onClose(false)} disabled={busy}>
              Cerrar turno y narrar
            </button>
          ) : null}
          {progress.canForceClose ? (
            <button type="button" className="btn" onClick={() => onClose(true)} disabled={busy} title="Solo el anfitrión: cierra aunque falte alguien">
              Forzar cierre
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
