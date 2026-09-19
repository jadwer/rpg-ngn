'use client'

import type { TurnView } from '@rpg-ngn/api-client'
import { appendRoll, QUICK_DICE, quickRoll, turnLine, type DiceMode, type TurnProgress } from '@rpg-ngn/ui-logic'
import { useState, type KeyboardEvent } from 'react'

interface Props {
  turn: TurnView | null
  progress: TurnProgress
  nameOf: (characterId: string) => string
  busy: boolean
  /** Ultimo aviso de una accion (409, 422, 403). */
  notice: string | null
  hasCharacter: boolean
  /** Quien tira en esta mesa; con `engine` los dados de aqui no pintan nada. */
  diceMode: DiceMode
  onRespond: (text: string) => Promise<boolean>
  onClose: (force: boolean) => void
}

/**
 * Cuadro de respuesta (docs/09): quien respondio y quien falta (nombres,
 * nunca textos), el cuadro para escribir si toca (Ctrl+Enter envia), y el
 * cierre cuando no falta nadie. Mientras el DM narra, solo el aviso.
 */
export function TurnPanel({ turn, progress, nameOf, busy, notice, hasCharacter, diceMode, onRespond, onClose }: Props) {
  const [text, setText] = useState('')
  const [die, setDie] = useState<string>(QUICK_DICE[0])
  const line = turnLine(turn, progress, nameOf)

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
        <span>{line}</span>
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
          <textarea className="textarea" name="respuesta" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="¿Qué haces? Escribe tu acción o di que no haces nada. Ctrl+Enter envía." disabled={busy} rows={3} />
          <div className="actions">
            <button type="button" className="btn primary" onClick={() => void send()} disabled={busy || text.trim().length === 0}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Enviar
            </button>
            {/* Tirar por tu cuenta al declarar; cuando el DM pide una tirada, la
                resuelve el motor. En una mesa donde tira el servidor no se
                ofrece: el numero que escribieras se ignoraria. */}
            {diceMode === 'engine' ? null : (
            <span className="dice-picker">
              <select className="select" name="dado" value={die} onChange={(e) => setDie(e.target.value)} disabled={busy} aria-label="Dado">
                {QUICK_DICE.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <button type="button" className="btn" onClick={() => setText((current) => appendRoll(current, quickRoll(die)))} disabled={busy} title="Tira el dado y escribe el resultado en tu respuesta">
                Tirar
              </button>
            </span>
            )}
            <span className="hint">{diceMode === 'engine' ? 'En esta mesa los dados los tira el servidor. Ctrl+Enter también envía.' : 'Ctrl+Enter también envía.'}</span>
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
