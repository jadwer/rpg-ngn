'use client'

import type { TurnView } from '@rpg-ngn/api-client'
import { appendRoll, countdownLine, QUICK_DICE, turnLine, type Countdown, type DiceMode, type TurnProgress } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { HoldDie } from './HoldDie'

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
  /** La cuenta atras del cierre (docs/18, D-UX-3). */
  countdown: Countdown
  /** La espera como ficcion mientras el DM narra; null si no narra. */
  waiting: string | null
  onRespond: (text: string) => Promise<boolean>
  onClose: (force: boolean) => void
  onHold: (held: boolean) => void
  /** Se teclea (true) o se dejo de teclear (false); el aviso lo ven los demas. */
  onTyping: (typing: boolean) => void
  /** Si a este jugador le falta tirar la Fortuna de la sesion. */
  fortunePending: boolean
  /** Pide la tirada a la API; devuelve el numero que saco el servidor. */
  onFortune: () => Promise<number>
  /** El anfitrion se quedo sin turnos: el aviso lleva a recargar antes de chocar con el cierre. */
  outOfTurns: boolean
}

/**
 * Cuadro de respuesta (docs/09): que pasa ahora en una linea, el cuadro para
 * escribir si toca (Ctrl+Enter envia), y el cierre. Quien respondio y quien
 * falta ya no se lista aqui: esta en "Jugadores", con estado por persona.
 * Cuando no falta nadie, cuenta atras cancelable por cualquiera; en espera,
 * se cierra a mano.
 */
export function TurnPanel({ turn, progress, nameOf, busy, notice, hasCharacter, diceMode, countdown, waiting, onRespond, onClose, onHold, onTyping, fortunePending, onFortune, outOfTurns }: Props) {
  const [fortuneError, setFortuneError] = useState<string | null>(null)
  // Tras caer el dado el cuadro se va sin esperar al siguiente sondeo, que
  // es el que confirma que ya no toca; si vuelve a tocar (sesion nueva), vuelve.
  const [fortuneLanded, setFortuneLanded] = useState(false)
  useEffect(() => {
    if (!fortunePending) setFortuneLanded(false)
  }, [fortunePending])
  const [text, setText] = useState('')

  const send = async () => {
    const value = text.trim()
    if (!value || busy) return
    onTyping(false)
    if (await onRespond(value)) setText('')
  }

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void send()
    }
  }

  const open = turn?.status === 'open'

  return (
    <div className="turn">
      {progress.narrating ? (
        <div className="waiting" role="status">
          <span className="spinner" aria-hidden />
          <span className="phrase">{waiting ?? 'El director narra...'}</span>
        </div>
      ) : countdown.active ? (
        <div className="countdown" role="status">
          <span className="ring" aria-hidden>
            {countdown.remaining}
          </span>
          <span className="text">{countdownLine(countdown)}</span>
          <button type="button" className="btn small" disabled={busy} onClick={() => onHold(true)} title="Un momento: la mesa espera hasta que alguien cierre">
            Cancelar
          </button>
        </div>
      ) : countdown.held ? (
        <div className="countdown held" role="status">
          <span className="text">{countdownLine(countdown)}</span>
          <button type="button" className="btn small primary" disabled={busy} onClick={() => onClose(false)}>
            Cerrar y narrar
          </button>
          <button type="button" className="btn ghost small" disabled={busy} onClick={() => onHold(false)}>
            Reanudar
          </button>
        </div>
      ) : (
        <div className="status">{turnLine(turn, progress, nameOf)}</div>
      )}

      {outOfTurns ? (
        <div className="error">
          La mesa se quedó sin turnos. <Link href="/perfil">Recarga en Mi cuenta y créditos</Link> o usa tu propia clave en los ajustes del director.
        </div>
      ) : null}
      {turn?.error ? <div className="error">El DM tuvo un problema y el turno se reabrió: {turn.error}</div> : null}
      {notice && notice !== turn?.error ? <div className="error">{notice}</div> : null}

      {/* La Fortuna la tira cada jugador con su dado; el numero lo saca el
          servidor, asi que no hay texto que editar ni dado fisico que creer. */}
      {open && hasCharacter && fortunePending && !fortuneLanded ? (
        <div className="fortune" role="group" aria-label="Tu Fortuna de esta sesión">
          <HoldDie
            die="1d20"
            label="Fortuna"
            disabled={busy}
            serverRoll={onFortune}
            onRolled={() => {
              setFortuneError(null)
              setTimeout(() => setFortuneLanded(true), 1500)
            }}
            onFailed={(error) => setFortuneError(error instanceof Error ? error.message : 'No se pudo tirar; prueba otra vez.')}
          />
          <span className="text">
            <b>Tira tu Fortuna.</b> Mantén presionado el dado y suéltalo. No se te dice para qué sirve.
          </span>
          {fortuneError ? <span className="error">{fortuneError}</span> : null}
        </div>
      ) : null}

      {progress.canRespond ? (
        <>
          <textarea
            className="textarea"
            name="respuesta"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              onTyping(e.target.value.trim().length > 0)
            }}
            onBlur={() => {
              if (text.trim().length === 0) onTyping(false)
            }}
            onKeyDown={onKey}
            placeholder="¿Qué haces? Escribe tu acción o di que no haces nada."
            disabled={busy}
            rows={3}
          />
          <div className="actions">
            <button type="button" className="btn primary" onClick={() => void send()} disabled={busy || text.trim().length === 0}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Enviar
            </button>
            {/* Tirar por tu cuenta al declarar; cuando el DM pide una tirada, la
                resuelve el motor. En una mesa donde tira el servidor no se
                ofrece: el numero que escribieras se ignoraria. */}
            {diceMode === 'engine' ? null : (
              <span className="dice-row" aria-label="Dados: mantén presionado y suelta">
                {QUICK_DICE.map((d) => (
                  <HoldDie key={d} die={d} disabled={busy} onRolled={(roll) => setText((current) => appendRoll(current, roll))} />
                ))}
              </span>
            )}
            <span className="hint">Ctrl+Enter también envía.</span>
          </div>
        </>
      ) : null}
      {open && !hasCharacter ? <div className="hint">Miras la mesa sin personaje: puedes leer y cerrar el turno, pero no responder.</div> : null}
      {open && progress.hasResponded && !countdown.active && !countdown.held ? <div className="sent">Tu respuesta está enviada.</div> : null}

      {/* Sin cuenta atras (falta gente, o la API no manda completedAt): el cierre a mano de siempre. */}
      {(progress.canClose && !countdown.active && !countdown.held) || progress.canForceClose ? (
        <div className="actions">
          {progress.canClose ? (
            <button type="button" className="btn" onClick={() => onClose(false)} disabled={busy}>
              Cerrar turno y narrar
            </button>
          ) : null}
          {progress.canForceClose ? (
            <button type="button" className="btn ghost" onClick={() => onClose(true)} disabled={busy} title="Solo el anfitrión: cierra aunque falte alguien">
              Forzar cierre
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
